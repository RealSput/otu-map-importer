const MAP_ID = 30; // only use numbers 1 - 30 to avoid issue. this MUST be 30 for the public map importer.

extract({
	// things below are not needed
	/*
	//#// File & Level Path //#//
	PATH: 'testmap_dj.osu', // .osu file name
	OUTPUT_MAP: 'otu alpha20 me', // gd level NAME to output to
	SONG_ID: '444555', // songID of the song to be used with the map (445589)
	*/

	//#// Dev Manual Entry //#//
	// Please refer to the spreadsheet for what these values should be!
	STAR_DIFFICULTY: 7.1, // might need manual entry - for now we put it here
	MAP_ORDERED_GROUP: (3260 + MAP_ID), // id of spawn ordered data - 3261 to 3290
	DATA_MENU_GROUP: (3290 + MAP_ID), // id of menu data to be spawned in menu - 3291 to 3320
	BPM_DATA_GROUP: (3220 + MAP_ID), // id of the bpm moves for this map - 3321 to 3350
	SONG_SPAWN_GROUP: (3390 + MAP_ID), // id of the groups that spawn the song triggers - 3391 to 3420
	X_OFFSET: 20000, // right of all objects and triggers
	Y_OFFSET: (750 * MAP_ID), // maps are 22 blocks tall, round to 25 for space. 25*30=750 increments.
	MAP_INDEX: MAP_ID, // set here to be used in index.js

	//#// Block/Trigger IDs and Constants //#//
	MOVE_TRIGGER_ID: 901,
	TOGGLE_TRIGGER_ID: 1049,
	SPAWN_TRIGGER_ID: 1268,
	ROTATE_TRIGGER_ID: 1346,
	PICKUP_TRIGGER_ID: 1817,
	SONG_TRIGGER_ID: 1934,
	SCALE_TRIGGER_ID: 2067,
	ITEM_EDIT_TRIGGER_ID: 3619,
	TIMER_SPAWN_GROUP: 223, // mapped to be a type group in index
	CURSOR_GROUP: 107, // id of the cursor that goes to the notes
	BPM_OFF_GROUP: 3234, // toggles bpm groups to be default off, they toggle on when map starts

	//#// Game Constants //#//
	X_VELOCITY_BPS: 10.3853853854 // We love Robert Topala game so very much!
});