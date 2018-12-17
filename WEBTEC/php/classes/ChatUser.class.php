<?php

class ChatUser extends ChatBase{
	
	protected $name = '', $email = '', $fingerprint = '', $pw = '', $priv = '', $active = '';
	
	public function save(){
			
		
		DB::query("
			INSERT INTO webchat_users (name, email, pw)
			VALUES (
				'".DB::esc($this->name)."',
				'".DB::esc($this->email)."',
				'".DB::esc($this->pw)."'
		)"); 
		
		return DB::getMySQLiObject();
	}
	
	public function existing(){
		
		DB::query("
			SELECT * FROM webchat_users
			WHERE
				name = '".DB::esc($this->name)."'
				OR
				email = '".DB::esc($this->email)."'
			");
			
		return DB::getMySQLiObject();
	}
	
	public function check(){
		
		DB::query("
			SELECT * FROM webchat_users
			WHERE
				name = '".DB::esc($this->name)."'
				AND
				email = '".DB::esc($this->email)."'
				AND
				pw = '".DB::esc($this->pw)."'
			");
		
		return DB::getMySQLiObject();
	}
	
	public function checkPriv(){
		return DB::query("
			SELECT admin FROM webchat_users
			WHERE
				name = '".DB::esc($this->name)."'
				AND
				email = '".DB::esc($this->email)."'
		");
	}
	
	public function checkActivated(){
		return DB::query("
			SELECT active FROM webchat_users
			WHERE
				name = '".DB::esc($this->name)."'
				AND
				email = '".DB::esc($this->email)."'
		");
	}
	
	public function update(){
		
		DB::query("
			UPDATE webchat_users
			SET last_activity = NOW()
			WHERE name = '".DB::esc($this->name)."'
		");
	}
}

?>