<?php

header('Content-Type: application/json; charset=utf-8');

$data = [
    'title' => "New Card",
    'content' => "This is my content.",
    'my-fragment' => "This is my alternative content.",
];

print json_encode($data);