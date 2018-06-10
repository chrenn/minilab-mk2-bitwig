// Load API v6.
loadAPI(6);

// Basic setup.
host.setShouldFailOnDeprecatedUse(true);
host.defineController("Arturia", "MiniLab Mk II", "1.0", "2fdbbb1f-f771-43f7-83e8-bc01c3e573de", "bequadro");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Arturia MiniLab mkII"], ["Arturia MiniLab mkII"]);

// MIDI messages.
const MIDI_STATUS_PAD_ON = 153;
const MIDI_STATUS_PAD_OFF = 137;
const MIDI_STATUS_KNOBS = 176;
const MIDI_DATA1_PAD_OFFSET = 36;

// Knobs mapping (MIDI data1).
const KNOB1 = 112;
const KNOB1_CLICK = 113;
const KNOB9 = 114;
const KNOB9_CLICK = 115;
const KNOBS_LEFT_ = [74, 71, 76, 18, 19, 16];
const KNOBS_RIGHT = [77, 93, 73, 75, 17, 91, 79, 72];

// MiniLab colors.
const COLOR = {
	BLACK: "00",
	RED: "01",
	BLUE: "10",
	GREEN: "04",
	CYAN: "14",
	PURPLE: "11",
	YELLOW: "05",
	WHITE: "7F"
};

// Set single pad color via SysEx.
function setPadColor(pad, color) {
	let padHex = (112 + pad).toString(16);
	sendSysex("F0 00 20 6B 7F 42 02 00 10 " + padHex + " " + color + " F7");
}

// Pad color mapping. Notes = white, Control = color.
const PAD_COLORS = [
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.WHITE,
	COLOR.BLACK,
	COLOR.BLACK,
	COLOR.CYAN,
	COLOR.GREEN,
	COLOR.YELLOW,
	COLOR.RED
];

function init() {
	// Create separate inputs for keys and pads. Set aftertouch to pads.
	MiniLabKeys = host.getMidiInPort(0).createNoteInput("MiniLab Keys", "80????", "90????", "B001??", "B002??", "B007??", "B00B??", "B040??", "C0????", "D0????", "E0????");
	MiniLabKeys.setShouldConsumeEvents(false);
	MiniLabPads = host.getMidiInPort(0).createNoteInput("MiniLab Pads", "?9????");
	MiniLabPads.setShouldConsumeEvents(false);
	MiniLabPads.assignPolyphonicAftertouchToExpression(0, NoteExpression.TIMBRE_UP, 2);

	// Only enable the lower 8 pad keys.
	let padTranslation = new Array(128);
	for (let i = 0; i < 128; i++) {
		padTranslation[i] = -1;
	}
	for (let i = MIDI_DATA1_PAD_OFFSET; i < MIDI_DATA1_PAD_OFFSET + 8; i++) {
		padTranslation[i] = i;
	}
	MiniLabPads.setKeyTranslationTable(padTranslation);

	// Define global transport variable.
	transport = host.createTransport();

	// Currently selected track, device and macros.
	track = host.createCursorTrack(1, 1);
	device = track.createCursorDevice();
	macros = device.createCursorRemoteControlsPage(8);
	
	// Freely assignable controls.
	ccKnobs = host.createUserControls(6);

	// Define Callbacks (no SysEx).
	host.getMidiInPort(0).setMidiCallback(onMidi);

	// Set colors for all pads.
	for (let i = 0; i < 16; i++) {
		setPadColor(i, PAD_COLORS[i]);
	}

	// Set colored control indicators.
	// for (let i = 0; i < 6; i++) {
	// 	ccKnobs.getControl(i).setIndication(true);
	// }
	// for (let i = 0; i < 8; i++) {
	// 	macros.getParameter(i).setIndication(true);
	// }

	// Hi.
	println("MiniLab MK2 Controller Script by @bequadro.");
}

// Called when a short MIDI message is received on MIDI input port 0.
// Status: Note on/off, CC, PB, ...
// Data1: Note number, CC number
// Data2: Note velocity, pressure, CC data (0-127)
function onMidi(status, data1, data2) {

	let padNumber = data1 - MIDI_DATA1_PAD_OFFSET;

	if (status === MIDI_STATUS_PAD_ON) {

		switch (padNumber) {
			case 8:
				track.selectPrevious();
				break;
			case 9:
				track.selectNext();
				break;
			case 12:
				transport.isMetronomeEnabled().toggle();
				break;
			case 13:
				transport.play();
				break;
			case 14:
				transport.stop();
				break;
			case 15:
				transport.record();
				break;
		}

		//setPadColor(padNumber, PAD_COLORS[padNumber]);

	} else if (status === MIDI_STATUS_PAD_OFF) {

		setPadColor(padNumber, PAD_COLORS[padNumber]);

	} else if (status === MIDI_STATUS_KNOBS) {

		// Relative knob data value between 61 and 67. Multiply with speed parameter?
		let increment = (data2 - 64);

		switch (data1) {
			case KNOB1:
				track.pan().inc(increment, 128);
				break;
			case KNOB1_CLICK:
				track.pan().reset();
				break;
			case KNOB9:
				track.volume().inc(increment, 128);
				break;
			case KNOB9_CLICK:
				track.volume().reset();
				break;
			default: {
				let ccIndex = KNOBS_LEFT_.indexOf(data1);
				if (ccIndex > -1) {
					ccKnobs.getControl(ccIndex).inc(increment, 128);
				} else {
					let macroIndex = KNOBS_RIGHT.indexOf(data1);
					if (macroIndex > -1) {
						macros.getParameter(macroIndex).inc(increment, 128);
					}
				}
			}
		}

	}

	//println('Status: ' + status + ', Data1: ' + data1 + ', Data2: ' + data2);

}

function flush() {
}

function exit() {
}