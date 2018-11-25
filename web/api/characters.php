<?php
function error($code, $msg) {
  http_response_code($code);
  die( json_encode( array("error" => $msg) ) );
}

function check_errors() {
  if ( !isset($_GET["account"]) )    {
    error(400, "Missing account");
  }
}

function get_characters_by_account($pdo, $name) { 
  $query = "
  SELECT 
    characters.name AS name, 
    l.name AS league, 
    DATE_FORMAT(relations.found, '%Y-%m-%dT%TZ') AS found,
    DATE_FORMAT(relations.seen, '%Y-%m-%dT%TZ') AS seen
  FROM account_relations AS relations
  JOIN account_characters AS characters 
    ON relations.id_c = characters.id
  JOIN data_leagues AS l 
    ON relations.id_l = l.id
  WHERE id_a = (SELECT id FROM account_accounts WHERE name = ? LIMIT 1)
  ORDER BY seen DESC
  LIMIT 128
  ";

  $stmt = $pdo->prepare($query);
  $stmt->execute([$name]);

  return $stmt;
}

function parse_data($stmt) {
  $payload = array();

  while ($row = $stmt->fetch()) {
    // Form a temporary row array
    $tmp = array(
      'character' => $row['name'],
      'found'     => $row['found'],
      'seen'      => $row['seen'],
      'league'    => $row['league']
    );

    // Append row to payload
    $payload[] = $tmp;
  }

  return $payload;
}

// Define content type
header("Content-Type: application/json");

// Check parameter errors
check_errors();

// Connect to database
include_once ( "../details/pdo.php" );

$stmt = get_characters_by_account($pdo, $_GET["account"]);
$data = parse_data($stmt);

// Display generated data
echo json_encode($data, JSON_PRESERVE_ZERO_FRACTION);
