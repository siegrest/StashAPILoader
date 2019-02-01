<?php
function error($code, $msg) {
  http_response_code($code);
  die( json_encode( array("error" => $msg) ) );
}

function check_errors() {
  if ( !isset($_GET["league"]) )    {
    error(400, "Missing league");
  }
}

function get_data($pdo) {
  $query1 = "SELECT 
    i.id_d, i.mean, i.median, i.mode, i.min, i.max, 
    i.exalted, i.total, i.daily, i.current, i.accepted
  FROM      league_items AS i 
  JOIN      data_leagues AS l 
    ON      l.id = i.id_l 
  WHERE     l.name   = ?
    AND     l.active = 1 
    AND     i.total  > 1 
  ORDER BY  id ASC";

  $query2 = "SELECT 
    i.id_d, i.mean, i.median, i.mode, i.min, i.max, 
    i.exalted, i.total, i.daily, i.current, i.accepted
  FROM      league_items AS i 
  JOIN      data_itemData AS did 
    ON      i.id_d = did.id 
  JOIN      data_leagues AS l 
    ON      l.id = i.id_l 
  JOIN      data_categories AS dc 
    ON      did.id_cat = dc.id 
  WHERE     l.name   = ?
    AND     dc.name  = ?
    AND     l.active = 1 
    AND     i.total  > 1 
  ORDER BY  i.id_d ASC";

  if (isset($_GET["category"])) {
    $stmt = $pdo->prepare($query2);
    $stmt->execute([$_GET["league"], $_GET["category"]]);
  } else {
    $stmt = $pdo->prepare($query1);
    $stmt->execute([$_GET["league"]]);
  }

  return $stmt;
}

function parse_data($stmt) {
  $payload = array();

  while ($row = $stmt->fetch()) {
    // Form a temporary row array
    $tmp = array(
      'id'       => (int)   $row['id_d'],
      
      'mean'     => (float) $row['mean'],
      'median'   => (float) $row['median'],
      'mode'     => (float) $row['mode'],
      'min'      => (float) $row['min'],
      'max'      => (float) $row['max'],
      'exalted'  => (float) $row['exalted'],

      'total'    => (int)   $row['total'],
      'daily'    => (int)   $row['daily'],
      'current'  => (int)   $row['current'],
      'accepted' => (int)   $row['accepted'],
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

// Get database entries
$stmt = get_data($pdo);

// If no results with provided id
if ($stmt->rowCount() === 0) {
  error(400, "No results");
}

$data = parse_data($stmt);

// Display generated data
echo json_encode($data, JSON_PRESERVE_ZERO_FRACTION);
