<?php

/* The Chat class exploses public static methods, used by ajax.php */

class Chat{
	
	const persistentChat = 1;
	
	public static function register($name,$email,$pw){
		if(!$name || !$email || !$pw)
		{
			throw new Exception('Fill in all the required fields.');
		}
		
		$name = self::checkXSS($name);
		$email = self::checkXSS($email);
		$pw = self::checkXSS($pw);
		
		if(!filter_input(INPUT_POST,'email',FILTER_VALIDATE_EMAIL)){
			throw new Exception('Please fill in a valid email adress!');
		}

		$gravatar = md5(strtolower(trim($email)));
		$pw = hash('sha256', $pw . $gravatar);
		
		$user = new ChatUser(array(
			'name'		=> $name,
			'email'	=> $email,
			'pw' => $pw
		));
		
		if($user->existing()->affected_rows != 0)
		{
			throw new Exception('This nick or mail is in use.');
		} else {
			if($user->save()->affected_rows != 1){
				throw new Exception('An error occured while saving your user! Please try again later');
			}
			return array(
				'status'	=> 1,
				'name'		=> $name,
				'gravatar'	=> Chat::gravatarFromHash($gravatar),
			);
		}
	}
	
	public static function login($nameOrMail, $pw){		
		if(!$nameOrMail || !$pw){
			throw new Exception('Fill in all the required fields.');
		}
		
		$nameOrMail = self::checkXSS($nameOrMail);
		$pw = self::checkXSS($pw);
		
		if(!filter_input(INPUT_POST,'nameormail',FILTER_VALIDATE_EMAIL)){
			return self::loginNickname($nameOrMail, $pw);	
		} else {
			return self::loginEmail($nameOrMail, $pw);
		}
	}
	
	public static function loginNickname($name, $pw){
		$result = DB::query("SELECT email FROM webchat_users WHERE name ='".DB::esc($name)."';");
		
		if($result->num_rows == 1){
			$result= $result->fetch_object();		
			return self::loginDo($name, $result->email, $pw);			
		} else {
			throw new Exception('No user with your nickname found!');
		}
	}
	
	public static function loginEmail($email, $pw){
		$result = DB::query("SELECT name FROM webchat_users WHERE email ='".DB::esc($email)."';");
		
		if($result->num_rows == 1){
			$result= $result->fetch_object();
			return self::loginDo($result->name, $email, $pw);		
		} else {
			throw new Exception('No user with you email found!');
		}
	}
	
	public static function loginDo($name,$email, $pw){
		$gravatar = md5(strtolower(trim($email)));
		$pw = hash('sha256', $pw . $gravatar);
		
		$user = new ChatUser(array(
			'name'		=> $name,
			'email'	=> $email,
			'pw' => $pw
		));
		
		if($user->check()->affected_rows != 1){
			throw new Exception('Wrong password or username / email combination submitted ');
		} else {
			
			if($user->checkActivated()->fetch_object()->active != 1){
				throw new Exception('Your account was not activated yet or was banned by an admin!');
			}
			
			$_SESSION['user'] = array(
				'name'		=> $name,
				'email'		=> $email,
				'gravatar'	=> $gravatar,
				'pw' => $pw,
				'priv' => $user->checkPriv()->fetch_object()->admin
			);

			return array(
				'status'	=> 1,
				'name'		=> $name,
				'gravatar'	=> Chat::gravatarFromHash($gravatar),
				'priv' => $user->checkPriv()->fetch_object()->admin
			);
		};
	}
	
	public static function checkLogged(){
		$response = array('logged' => false);
			
		if($_SESSION['user']['name']){
			
			$result = DB::query("SELECT active FROM webchat_users WHERE name = '".DB::esc($_SESSION['user']['name'])."';");
			$active = $result->fetch_object()->active;
			
			if($active == 1){
				$response['logged'] = true;
				$response['loggedAs'] = array(
					'name'		=> $_SESSION['user']['name'],
					'gravatar'	=> Chat::gravatarFromHash($_SESSION['user']['gravatar']),
					'priv' => $_SESSION['user']['priv']
				);
			} else {
				self::logout();
			}
		} else {
			self::logout();
		}
		
		return $response;
	}
	
	public static function logout(){
		if(self::persistentChat == 0)
		{
				DB::query("DELETE FROM webchat_users WHERE name = '".DB::esc($_SESSION['user']['name'])."'");
		}
		
		$_SESSION = array();
		unset($_SESSION);
		
		session_destroy();

		return array('status' => 1);
	}
	
	public static function submitChat($chatText){		
		if(!$_SESSION['user']){
			throw new Exception('You are not logged in');
		}
		
		if(!$chatText){
			throw new Exception('You haven\' entered a chat message.');
		}
		
		$chatText = self::checkXSSMessage($chatText);
		
		$name = $_SESSION['user']['name'];
		$name = DB::esc($name);
		
		$result = DB::query("SELECT id, active FROM webchat_users WHERE name = '".$name."'");
		$result = $result->fetch_object();
		
		if($result->active == 1){
			$chat = new ChatLine(array(
				'author_id'	=> $result->id,
				'text'		=> $chatText
			));
		
			// The save method returns a MySQLi object
			$insertID = $chat->save()->insert_id;
			
			return array(
				'status'	=> 1,
				'insertID'	=> $insertID
			);
		} else {
				self::logout();
				throw new Exception("Your account was deactivated! Please reload the page!");
		}
	}
	
	public static function getUsers(){
		if($_SESSION['user']['name']){
			$user = new ChatUser(array('name' => $_SESSION['user']['name']));
			$user->update();
		}
		
		// Deleting chats older than 5 minutes and users inactive for 30 seconds
		
		if(self::persistentChat == 0)
		{
			DB::query("DELETE FROM webchat_lines WHERE ts < SUBTIME(NOW(),'0:5:0')");
		}
		
		// 	Commented to keep Users => else fingerprint wouldnt make any sense / admin portal too
		//	DB::query("DELETE FROM webchat_users WHERE last_activity < SUBTIME(NOW(),'0:0:30')");
		
		$result = DB::query("SELECT name, email FROM webchat_users WHERE last_activity > SUBTIME(NOW(), '0:0:30') AND active = 1 ORDER BY name ASC LIMIT 18");
		
		$users = array();
		while($user = $result->fetch_object()){
			$user->gravatar = Chat::gravatarFromHash(md5(strtolower(trim($user->email))));
			$user->email = '';
			$users[] = $user;
		}
	
		return array(
			'users' => $users,
			'total' => DB::query("SELECT COUNT(*) as cnt FROM webchat_users WHERE last_activity > SUBTIME(NOW(), '0:0:30')")->fetch_object()->cnt
		);
	}
	
	public static function getChats($lastID){
		
		$lastID = (int)$lastID;
	
		$result = DB::query('SELECT webchat_lines.id, webchat_users.name, webchat_users.email, webchat_lines.text, webchat_lines.ts FROM webchat_lines INNER JOIN webchat_users ON webchat_lines.author_id = webchat_users.id WHERE webchat_lines.id > '.$lastID.' ORDER BY webchat_lines.id ASC;');		

		$chats = array();
		while($chat = $result->fetch_object()){

			$chats[] = array(
				'id' => $chat->id,
				'author' => $chat->name,
				'gravatar' => Chat::gravatarFromHash(md5(strtolower(trim($chat->email)))),
				'time' => array(
				'hours'		=> gmdate('H',strtotime($chat->ts)),
				'minutes'	=> gmdate('i',strtotime($chat->ts))
				),
				'text' => $chat->text
			);
		}
	
		return array('chats' => $chats);
	}
	
	public static function adminView(){
		if($_SESSION['user']['priv'] != 1){
			throw new Exception("Your not an admin!");
		}
		
		$result = DB::query("SELECT name, email, admin, active, last_activity FROM webchat_users;");
		$users = array();
		
		while($user = $result->fetch_object()){
			$user->gravatar = Chat::gravatarFromHash(md5(strtolower(trim($user->email))));
			$users[] = $user;			
		}
		
		return array('users' => $users);		
	}
	
	public static function changeUser($name,$email,$userActiveCheckbox,$userAdminCheckbox){
		if($_SESSION['user']['priv'] != 1){
			throw new Exception("Your not an admin and can not change users!");
		}
		
		if($_SESSION['user']['name'] == $name || $_SESSION['user']['email'] == $email){
			throw new Exception("Your can not change yourself!");
		}
		
		$name = self::checkXSS($name);
		$email = self::checkXSS($email);
		
		if($userActiveCheckbox == 'on'){
			$userActiveCheckbox = 1;
		} else {
			$userActiveCheckbox = 0;
		}
		
		if($userAdminCheckbox == 'on'){
			$userAdminCheckbox = 1;
		} else {
			$userAdminCheckbox = 0;
		}
		
		$result = DB::query("UPDATE webchat_users SET admin = '".DB::esc($userAdminCheckbox)."', active = '".DB::esc($userActiveCheckbox)."' WHERE name = '".DB::esc($name)."' AND email = '".DB::esc($email)."';");
		$result = DB::query("SELECT * FROM webchat_users WHERE name = '".DB::esc($name)."' AND email = '".DB::esc($email)."' AND admin = '".DB::esc($userAdminCheckbox)."' AND active = '".DB::esc($userActiveCheckbox)."';");  
		
		if($result->num_rows != 1)
		{
			throw new Exception("Error saving the changed users!");
		} else {
			return array('status' => 1);
		}
	}
	
	public static function deleteUser($name,$email,$id_return){
		if($_SESSION['user']['priv'] != 1){
			throw new Exception("Your not an admin and can not delete users!");
		}
		
		$name = self::checkXSS($name);
		$email = self::checkXSS($email);
		
		if($_SESSION['user']['name'] == $name || $_SESSION['user']['email'] == $email){
			throw new Exception("Your can not delete yourself!");
		}
		
		$result = DB::query("SELECT * FROM webchat_users WHERE name = '".DB::esc($name)."' AND email = '".DB::esc($email)."';");
		if($result->num_rows != 1)
		{
			throw new Exception("Error while deleting the selected user! Please reload the page");
		}
		
		$id = DB::esc($result->fetch_object()->id);
		if($id){
			$result = DB::query("DELETE FROM webchat_lines WHERE author_id = ".$id.";");
			$result = DB::query("DELETE FROM webchat_users WHERE id= ".$id.";");
		}
	
		return array ('id' => $id_return);
	}
	
	public static function deleteMessage($id){
		$id = (int)$id;
		
		if($_SESSION['user']['priv'] != 1){
			throw new Exception("Your not an admin and can not delete users!");
		}
		
		$result = DB::query("SELECT id FROM webchat_lines WHERE id = ".DB::esc($id).";");
		if($result->num_rows != 1)
		{
			throw new Exception("Error while deleting the selected message! Please reload the page");
		} else {
			$result = DB::query("DELETE FROM webchat_lines WHERE id = ".DB::esc($id).";");
		}
		
		return array ('id' => $id);
	}
	
	public static function gravatarFromHash($hash, $size=64){
		return 'http://www.gravatar.com/avatar/'.$hash.'?size='.$size.'&amp;default='.
				urlencode('http://www.gravatar.com/avatar/ad516503a11cd5ca435acc9bb6523536?size='.$size);
	}
	
	public static function checkXSSMessage($text){
	
		$text = (String)(filter_var($text,FILTER_SANITIZE_STRING));
		if(!$text || trim($text) == ''){
			throw new Exception('Stop XSS - XSS Protection activated');
		}
		
		return $text;
	}
	
	public static function checkXSS($text){
		
		$textTest = $text;
		$text = (String)(filter_var($text,FILTER_SANITIZE_STRING));
		if(!$text || trim($text) == ''|| $text != $textTest){
			throw new Exception('Stop XSS - XSS Protection activated');
		}
		
		return $text;
	}
}


?>