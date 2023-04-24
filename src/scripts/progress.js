/*! Progress v1.0.0 */

class Progress {

    constructor( wrapper ) {

        this.progressState = {
            PENDING: 1,
            RUNNING: 2,
            PAUSED: 3,
            COMPLETED: 4,
        };

        this.wrapper = wrapper;
        this.bar = wrapper.firstElementChild;
        this.valueElem = this.bar.nextElementSibling;
        this.stateElem = this.valueElem.nextElementSibling;
        this.abortButton = this.stateElem.nextElementSibling;

        this.setState(this.progressState.PENDING);
        this.value = 0;
        this.timesCompleted = 0;
        this.running = false;
        this.animationFrame;

        this.abortButton.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }

    static createElement() {

        const wrapper = document.createElement('div');
        wrapper.classList.add('prog-msg');

        const bar = document.createElement('div');
        bar.classList.add('bar');

        const value = document.createElement('div');
        value.classList.add('val');

        const state = document.createElement('div');
        state.classList.add('state');

        const abortButton = document.createElement('button');
        abortButton.setAttribute('type', 'button');
        abortButton.classList.add('abort');

        abortButton.appendChild(document.createTextNode('Abort'));

        wrapper.appendChild(bar);
        wrapper.appendChild(value);
        wrapper.appendChild(state);
        wrapper.appendChild(abortButton);

        return new Progress(wrapper);
    }

    stateToText( state ) {

        switch( state ) {
            case 1: return 'Pending';
            case 2: return 'Running';
            case 3: return 'Paused';
            case 4: return 'Completed';
        }
    }

    setState( state ) {

        this.state = state;

        let stateTitle = this.stateToText(this.state);

        this.stateElem.innerText = stateTitle;
        this.wrapper.setAttribute('data-state', stateTitle.toLowerCase());
    }

    isActive() {

        return ( this.running !== false );
    }

    isRunning() {

        return ( this.state === this.progressState.RUNNING );
    }

    isPaused() {

        return ( this.state === this.progressState.PAUSED );
    }

    setValue( value ) {

        value = Math.min(100, Math.max(0, value));

        this.value = value;
        this.valueElem.innerText = Math.floor(value) + '%';

        this.wrapper.style.setProperty('--progress-value', (Math.round(value * 100) / 100) + '%');
    }

    progressTo( value, duration = 500 ) {

        if( this.isActive() ) {
            this.stop();
        }

        // Sets up single goal runner config.
        let session = {
            'type': 'single',
            'initValue': this.value,
            // Next value can be higher or lower than the initial value.
            'nextValue': value,
            'duration': duration,
            'pauseLength': 0,
        };

        session.promise = new Promise((resolve, reject) => {
            session.resolution = [resolve, reject];
        });

        this.running = session;
        this.setState(this.progressState.RUNNING);

        return this.runSingleGoalFrames();
    }

    runSingleGoalFrames() {

        if( this.running && this.running.type == 'single' ) {

            const frame = ( timestamp ) => {

                if( !this.running.startTime ) {
                    this.running.startTime = timestamp;
                }

                let handle = this.singleFrameHandler(timestamp, this.running);

                if( handle !== true ) {

                    this.setValue(handle);
                    this.animationFrame = requestAnimationFrame(frame);

                } else {

                    // Set the final value.
                    this.setValue(this.running.nextValue);
                    // Resolve the promise.
                    this.running.resolution[0]();

                    this.stop();
                }
            }

            this.animationFrame = requestAnimationFrame(frame);

            return this.running.promise;
        }
    }

    singleFrameHandler( timestamp, session ) {

        let elapsed = (timestamp - session.startTime - session.pauseLength);
        let elapsedPercentage = (elapsed * 100 / session.duration);

        if( elapsed <= session.duration ) {

            let result;

            // Growing
            if( session.nextValue > session.initValue ) {

                let goalSize = (session.nextValue - session.initValue);
                result = (session.initValue + (elapsedPercentage * goalSize / 100));

            // Shrinking
            } else {

                let goalSize = (session.initValue - session.nextValue);
                result = (session.initValue - (elapsedPercentage * goalSize / 100));
            }

            return result;

        } else {

            return true;
        }
    }

    accumulateValue( add ) {

        let value = (this.value + add);

        if( value <= 100 ) {

            return this.progressTo(value);

        } else {

            return new Promise((resolve, reject) => {
                reject(new Error("The accumulated value exceeds maximum 100 with " + value + "."));
            });
        }
    }

    progressPlanTo( plan, timeout = 10000, duration = 500, max_times = 10 ) {

        if( this.isActive() ) {
            this.stop();
        }

        this.setValue(0);
        this.setState(this.progressState.RUNNING);

        if( typeof plan.max_times === 'number' ) {
            max_times = plan.max_times;
        }

        max_times = Math.min(max_times, Math.floor(timeout / duration));

        if( !plan ) {
            plan = Progress.generateRandomNumbers(Progress.randomBetweenTwoNumbers(90, 99), max_times);
        }

        let session = {
            'type': 'plan',
            'plan': plan.numbers,
            'duration': duration,
            'timeout': timeout,
            'pauseLength': 0,
            'times': max_times,
            'finalValue': plan.max,
        };

        session.promise = new Promise((resolve, reject) => {
            session.resolution = [resolve, reject];
        });

        this.running = session;

        return this.runProgressPlanFrames();
    }

    runProgressPlanFrames() {

        if( this.running && this.running.type == 'plan' ) {

            const frame = ( timestamp ) => {

                if( !this.running.startTime ) {
                    this.running.startTime = timestamp;
                }

                let handle = this.planFrameHandler(timestamp, this.running);

                if( typeof handle === 'number' || handle === null ) {

                    if( typeof handle === 'number' ) {
                        this.setValue(handle);
                    }

                    this.animationFrame = requestAnimationFrame(frame);

                } else {

                    this.setValue(this.running.finalValue);
                    this.running.resolution[0]();

                    this.stop();
                }
            }

            this.animationFrame = requestAnimationFrame(frame);

            return this.running.promise;
        }
    }

    planFrameHandler( timestamp, session ) {

        let elapsed = (timestamp - session.startTime - session.pauseLength);
        let wait = Math.round((session.timeout - (session.duration * session.times)) / (session.times - 1));
        let cycleTime = (session.duration + wait);

        let gapNumberByElapsed = Math.floor(elapsed / cycleTime);

        let gapCycleEndTime = ((gapNumberByElapsed + 1) * cycleTime);
        let gapCycleActiveEndTime = (gapCycleEndTime - wait);

        let goalSize = session.plan[gapNumberByElapsed];

        if( elapsed <= gapCycleActiveEndTime ) {

            let travelledGaps = session.plan.slice(0, gapNumberByElapsed);
            let travelled = 0;

            if( travelledGaps.length ) {

                const reducer = (accumulator, curr) => accumulator + curr;
                travelled = travelledGaps.reduce(reducer);
            }

            let elapsedPercentage = ( !gapNumberByElapsed )
                ? (elapsed * 100 / session.duration)
                : ((elapsed - (gapCycleActiveEndTime - session.duration)) * 100 / session.duration);

            return ((elapsedPercentage * goalSize / 100) + travelled);

        // Mission complete.
        } else if( gapNumberByElapsed == (session.times - 1) ) {

            return true;

        // Just wait for the next step.
        } else {

            return null;
        }
    }

    stop() {

        if( this.isActive() ) {

            cancelAnimationFrame(this.animationFrame);

            this.running = false;
            this.setState(this.progressState.PENDING);
        }
    }

    complete( duration = 500 ) {

        if( this.value < 100 ) {

            return this.progressTo(100, duration).then(() => {

                this.timesCompleted++;
                this.setState(this.progressState.COMPLETED);
            });

        } else {

            return new Promise((resolve, reject) => {
                reject(new Error("Can not complete, because progress value is already at " + this.value + "."));
            });
        }
    }

    pause() {

        if( this.isRunning() ) {

            // Halt the frame runner.
            cancelAnimationFrame(this.animationFrame);

            this.running.pausedAt = performance.now();

            this.setState(this.progressState.PAUSED);
        }
    }

    resume() {

        if( this.isPaused() ) {

            let recentPauseLen = (performance.now() - this.running.pausedAt);

            this.running.pauseLength = (this.running.pauseLength + recentPauseLen);
            this.running.pausedAt = false;

            this.setState(this.progressState.RUNNING);
            this.wrapper.classList.remove('paused');

            if( this.running.type == 'single' ) {
                // Run with the same goals.
                return this.runSingleGoalFrames();
            } else {
                return this.runProgressPlanFrames();
            }
        }
    }

    revert() {

        return this.progressTo(0).then(() => {

            this.setState(this.progressState.PENDING);

        });
    }

    reset() {

        this.stop();
        this.setValue(0);

        this.setState(this.progressState.PENDING);
    }

    static randomBetweenTwoNumbers( min, max ) {

        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static generateRandomNumbers( max, max_times ) {

        let result = [];
        let currentSum = 0;

        for( let i = 0; i < (max_times - 1); i++ ) {

            // Choose something above 10 for the first number.
            const minNum = ( i == 0 )
                ? 10
                : 1;
            // Make sure the first number doesn't overshoot above 50.
            const maxNum = ( i == 0 )
                ? 50
                : (max - (max_times - i - 1) - currentSum);
            let num = 1;

            if( maxNum > 1 ) {
                num = Progress.randomBetweenTwoNumbers(minNum, maxNum);
            }

            result[i] = num;
            currentSum += num;
        }

        // Add in the remainder.
        result[(max_times - 1)] = (max - currentSum);

        return {
            'numbers': result,
            'max': max,
            'max_times': max_times,
        };
    }
}

export { Progress };