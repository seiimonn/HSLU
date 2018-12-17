<?php

/* Database Configuration. Add your details below */

$dbOptions = array(
	'db_host' => '',
	'db_user' => '',
	'db_pass' => '',
	'db_name' => ''
);

/* Database Config End */

//report everything except notice
error_reporting(E_ALL ^ E_NOTICE);

require "classes/DB.class.php";
require "classes/Chat.class.php";
require "classes/ChatBase.class.php";
require "classes/ChatLine.class.php";
require "classes/ChatUser.class.php";

ini_set( 'session.cookie_httponly', 1 );
session_name('webchat');
session_start();

try{
	
	// Connecting to the database
	DB::init($dbOptions);
	
	$response = array();
	
	// Handling the supported actions:
	
	switch($_GET['action']){
				
		case 'login':
			$response = Chat::login($_POST['nameormail'],$_POST['pw']);
		break;
		
		case 'checkLogged':
			$response = Chat::checkLogged();
		break;
		
		case 'logout':
			$response = Chat::logout();
		break;
		
		case 'submitChat':
			$response = Chat::submitChat($_POST['chatText']);
		break;
		
		case 'getUsers':
			$response = Chat::getUsers();
		break;
		
		case 'getChats':
			$response = Chat::getChats($_GET['lastID']);
		break;
		
		case 'register':
			$response = Chat::register($_POST['name'],$_POST['email'],$_POST['pw']);
		break;
		
		case 'adminView':
			$response = Chat::adminView();
		break;
		
		case 'adminChangeUser':
			$response = Chat::changeUser($_POST['name'],$_POST['email'],$_POST['userActiveCheckbox'],$_POST['userAdminCheckbox']);
		break;
		
		case 'adminDeleteUser':
			$response = Chat::deleteUser($_POST['name'],$_POST['email'],$_POST['id']);
		break;
		
		case 'deleteMessage':
			$response = Chat::deleteMessage($_POST['id']);
		break;
		
		default:
			throw new Exception('Wrong action');
	}
	
	echo json_encode($response);
}
catch(Exception $e){
	die(json_encode(array('error' => $e->getMessage())));
}

?>