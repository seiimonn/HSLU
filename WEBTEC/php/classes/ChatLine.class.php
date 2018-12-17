<?php

/* Chat line is used for the chat entries */

class ChatLine extends ChatBase{
	
	protected $text = '', $author = '', $author_id = '';
	
	public function save(){
		DB::query("
			INSERT INTO webchat_lines (author_id, text)
			VALUES (
				'".DB::esc($this->author_id)."',
				'".DB::esc($this->text)."'
		)");
		
		// Returns the MySQLi object of the DB class
		
		return DB::getMySQLiObject();
	}
}

?>