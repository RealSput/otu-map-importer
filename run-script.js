let fs = require('fs');
// Requirements //
require('@g-js-api/g.js');
let {
    Circulator
} = require('circulator');
let {
    HitType
} = require('osu-classes');
let {
    BeatmapDecoder
} = require('osu-parsers');
require('./constants.js');

// detect groups and allow object search //
console.log(`------------------------`);
console.log(`OSU TO GD CONVERTER`);
console.log(`------------------------`);

//#// Parse the .osu File //#//
let importOsu = async (osuFile, SONG_ID, outputMap = undefined) => {
    await $.exportConfig({
        type: "savefile",
        options: {
            info: true,
            level_name: outputMap
        }
    });

    let beatmap = new BeatmapDecoder()
        .decodeFromString(osuFile, false); // false = no storyboard data

    // set map variables //
    let overallDifficulty = beatmap.difficulty.overallDifficulty;
    let approachRateUnfiltered = beatmap.difficulty.approachRate.toFixed(1);
    let circleSize = beatmap.difficulty.circleSize.toFixed(1);
    let hpDrain = beatmap.difficulty.drainRate.toFixed(1);
    let mapBPM = beatmap.bpm;
    let stackOffset = beatmap.general.stackLeniency * 5;
    let mapLength = (beatmap.totalLength - beatmap.totalBreakTime).toFixed(3);
    let mapObjCount = beatmap.hitObjects.length;
    let circleCount = beatmap.hittable;
    let sliderCount = beatmap.slidable;
    let spinnerCount = beatmap.spinnable;
    let sliderMulti = beatmap.difficulty.sliderMultiplier;
    let mapID = beatmap.metadata.beatmapId;
    let previewTime = beatmap.general.previewTime;
    const mapGroup = group(MAP_ORDERED_GROUP);
    const dataGroup = group(DATA_MENU_GROUP);
    const bpmGroup = group(BPM_DATA_GROUP);
    const cursorGroup = group(CURSOR_GROUP);
    const timerSpawnGroup = group(TIMER_SPAWN_GROUP);
    const bpmOffGroup = group(BPM_OFF_GROUP);
    const songSpawnGroup = group(SONG_SPAWN_GROUP);
    const mapIndex = MAP_INDEX; // number from 1 - 30
    const arRange = [6, 7.3, 8, 8.5, 9, 9.2, 9.5];
    const hrOdMultiplier = 1.4;
    const ezOdMultiplier = 0.5;
    let hrOverallDifficulty = overallDifficulty * hrOdMultiplier;
    let ezOverallDifficulty = overallDifficulty * ezOdMultiplier;
    if (overallDifficulty > 10) {
        overallDifficulty = 10;
    }
    if (hrOverallDifficulty > 10) {
        hrOverallDifficulty = 10;
    }
    let perfectWindow = 80 - (6 * overallDifficulty);
    let goodWindow = 140 - (8 * overallDifficulty);
    let mehWindow = 200 - (10 * overallDifficulty);
    let perfectWindowEZ = 80 - (6 * ezOverallDifficulty);
    let goodWindowEZ = 140 - (8 * ezOverallDifficulty);
    let mehWindowEZ = 200 - (10 * ezOverallDifficulty);
    let perfectWindowHR = 80 - (6 * hrOverallDifficulty);
    let goodWindowHR = 140 - (8 * hrOverallDifficulty);
    let mehWindowHR = 200 - (10 * hrOverallDifficulty);
    let introOffset = 0; // updated based on the first object offset in milliseconds
    let approachRate = arRange.reduce((prev, curr) =>
        Math.abs(curr - approachRateUnfiltered) < Math.abs(prev - approachRateUnfiltered) ? curr : prev);
    let preempt = 1200 - (750 * (approachRate - 5)) / 5; // always greater than 5.00 in GD so we can use this equation
    let preemptPos = (preempt / 1000) * X_VELOCITY_BPS * 30;
    let totalCombos = 0; // must be used after placing objects as when the objects are placed, this is counted
    let firstObjectPos = 0; // changed in first object
    let firstObjectTime = 0; // changed in first object

    // read difficulty, kiai, and break points. these are later placed on the timeline
    let difficultyPoints = beatmap.controlPoints.difficultyPoints;
    const timingPointsArray = difficultyPoints.map(point => [point.group.startTime, point.sliderVelocityUnlimited]);

    let effectPoints = beatmap.controlPoints.effectPoints;
    const effectPointsArray = effectPoints.map(point => [point.group.startTime, point.kiai]);
    let kiai = 0;

    let samplePoints = beatmap.controlPoints.samplePoints;
    const samplePointsArray = samplePoints.map(point => [point.group.startTime, point.sampleSet, point.customIndex, point.volume]);
    //console.log(samplePointsArray);

    let breakPoints = beatmap.events.breaks;
    const breakPointsArray = breakPoints.map(point => [point.startTime, point.endTime]);

    $.add(
        object({
            // default toggle off bpm movements
            OBJ_ID: TOGGLE_TRIGGER_ID,
            X: -150,
            Y: 30,
            TARGET: bpmGroup,
            ACTIVATE_GROUP: false,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: bpmOffGroup
        })
    );

    // map variable data //
    $.add(
        object({
            // OD
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -150,
            Y: 360,
            ITEM_TARGET: 13,
            ITEM_TARGET_TYPE: TIMER,
            MOD: overallDifficulty,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // AR
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -150,
            Y: 330,
            ITEM_TARGET: 14,
            ITEM_TARGET_TYPE: TIMER,
            MOD: approachRate,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // CS
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -150,
            Y: 300,
            ITEM_TARGET: 60,
            ITEM_TARGET_TYPE: TIMER,
            MOD: circleSize,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // HPD
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -150,
            Y: 270,
            ITEM_TARGET: 61,
            ITEM_TARGET_TYPE: TIMER,
            MOD: hpDrain,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // bpm
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -150,
            Y: 240,
            ITEM_TARGET: 28,
            ITEM_TARGET_TYPE: TIMER,
            MOD: mapBPM,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // hitobject count
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -150,
            Y: 210,
            ITEM_TARGET: 74,
            ITEM_TARGET_TYPE: ITEM,
            MOD: mapObjCount,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // map length
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -150,
            Y: 180,
            ITEM_TARGET: 75,
            ITEM_TARGET_TYPE: TIMER,
            MOD: mapLength / 1000,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // toggle on just this bpm map
            OBJ_ID: TOGGLE_TRIGGER_ID,
            X: -150,
            Y: 150,
            TARGET: bpmGroup,
            56: true, // is toggle on checked
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // updates map values
            OBJ_ID: SPAWN_TRIGGER_ID,
            X: -150 + 15,
            Y: 120,
            TARGET: group(36),
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );

    // song select data //
    $.add(
        object({
            // circle size
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 300,
            ITEM_TARGET: 501,
            ITEM_TARGET_TYPE: TIMER,
            MOD: circleSize,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // approach rate
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 270,
            ITEM_TARGET: 502,
            ITEM_TARGET_TYPE: TIMER,
            MOD: approachRate,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // overall difficulty
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 240,
            ITEM_TARGET: 503,
            ITEM_TARGET_TYPE: TIMER,
            MOD: overallDifficulty,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // hp drain
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 210,
            ITEM_TARGET: 504,
            ITEM_TARGET_TYPE: TIMER,
            MOD: hpDrain,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // star rating
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 180,
            ITEM_TARGET: 505,
            ITEM_TARGET_TYPE: TIMER,
            MOD: STAR_DIFFICULTY,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // map time
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 150,
            ITEM_TARGET: 506,
            ITEM_TARGET_TYPE: TIMER,
            MOD: mapLength / 1000,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // bpm
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 120,
            ITEM_TARGET: 517,
            ITEM_TARGET_TYPE: TIMER,
            MOD: mapBPM,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // hit circle count
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 90,
            ITEM_TARGET: 507,
            ITEM_TARGET_TYPE: TIMER,
            MOD: circleCount,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // slider count
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 60,
            ITEM_TARGET: 508,
            ITEM_TARGET_TYPE: TIMER,
            MOD: sliderCount,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // spinner count
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 30,
            ITEM_TARGET: 509,
            ITEM_TARGET_TYPE: TIMER,
            MOD: spinnerCount,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );
    $.add(
        object({
            // beatmap ID
            OBJ_ID: ITEM_EDIT_TRIGGER_ID,
            X: -200,
            Y: 0,
            ITEM_TARGET: 547,
            ITEM_TARGET_TYPE: ITEM,
            MOD: mapID,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dataGroup
        })
    );

    if (mapIndex == 30) {
        console.log(`adding imported map menu song trigger`, SONG_ID);
        $.add(
            object({
                OBJ_ID: SONG_TRIGGER_ID,
                X: 495 - X_OFFSET,
                Y: 6255 - Y_OFFSET,
                SONG_VOLUME: 1,
                SONG_ID: SONG_ID,
                SONG_LOOP: true,
                408: previewTime, // start time
                SONG_FADE_IN: 500,
                SONG_CHANNEL: 4,
                EDITOR_LAYER_1: 2,
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: group(9361) // group that spawns when editor map is hovered in menu
            })
        );

        $.add(
            object({
                // beatmap ID
                OBJ_ID: ITEM_EDIT_TRIGGER_ID,
                X: 495 - X_OFFSET,
                Y: 6165 - Y_OFFSET,
                ITEM_TARGET: 28,
                ITEM_TARGET_TYPE: TIMER,
                MOD: mapBPM,
                EDITOR_LAYER_1: 2,
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: group(9361) // group that spawns when editor map is hovered in menu
            })
        );
    }

    // set group and cycle variables for circles and sliders //
    let circleMoves = new Circulator([156, 411, 470, 472, 558, 508, 555, 547,
        1791, 1993, 1996, 1995, 1998, 1997, 1780, 1867
    ].map(group));
    let circleSpawns = new Circulator([11, 416, 469, 471, 557, 507, 554, 546,
        1874, 1773, 2018, 1100, 2021, 1098, 2039, 2040
    ].map(group));
    let circleJudgementBars = new Circulator([1138, 1432, 1433, 1434, 1435, 1436, 1437, 1438,
        2023, 2024, 2025, 2026, 1994, 2027, 2028, 2029
    ].map(group));
    let circleJudgementStopGroups = new Circulator([1439, 1440, 1441, 1442, 1443, 1444, 1445, 1446,
        2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038
    ].map(group));
    circleMoves.prev();
    circleSpawns.prev();
    circleJudgementBars.prev();
    circleJudgementStopGroups.prev()
    let sliderLengthCounters = new Circulator([801, 802, 803, 804, 805, 806, 807, 808]);
    let sliderLengthScaleTargets = new Circulator([16, 597, 757, 947, 2649, 2672, 2673, 2674].map(group));
    let sliderVelocityScaleTargets = new Circulator([210, 594, 756, 943, 2675, 2676, 2677, 2678].map(group));
    let sliderReverseCounters = new Circulator([851, 852, 853, 854, 855, 856, 857, 858]);
    let sliderRotateTargets = new Circulator([158, 589, 758, 939, 2642, 2643, 2644, 2645].map(group));
    let sliderCenters = new Circulator([43, 573, 738, 904, 1952, 2273, 2217, 2510].map(group));
    let sliderSpawns = new Circulator([49, 575, 743, 922, 2153, 2325, 2460, 2556].map(group));
    let sliderBalls = [45, 567, 737, 907, 1955, 2275, 2433, 2512].map(group); // target and top left of use target move trigger
    let sliderBallEndsL = [48, 565, 739, 908, 2679, 2681, 2683, 2685].map(group); // top right of use target move trigger
    let sliderBallEndsR = [192, 566, 771, 913, 2680, 2682, 2684, 2686].map(group);
    let sliderBallStops = [207, 599, 769, 951, 2664, 2665, 2666, 2667].map(group);
    let sliderBallSpawnsL = [202, 602, 773, 797, 2086, 2288, 2446, 2523].map(group);
    let sliderBallSpawnsR = [203, 609, 784, 932, 2088, 2303, 2378, 2538].map(group);
    682
    let sliderJudgementBars = new Circulator([1448, 1449, 1450, 1451, 2651, 2652, 2260, 2116].map(group));
    let sliderJudgementStopGroups = new Circulator([1452, 1453, 1454, 1455, 2668, 2669, 2670, 2671].map(group));
    sliderLengthCounters.prev();
    sliderLengthScaleTargets.prev();
    sliderVelocityScaleTargets.prev();
    sliderReverseCounters.prev();
    sliderRotateTargets.prev();
    sliderCenters.prev();
    sliderSpawns.prev();
    sliderJudgementBars.prev();
    sliderJudgementStopGroups.prev();
    let previousLengthScaleValues = [];
    let previousVelocityScaleValues = [];
    let previousRotateDegrees = [];
    let previousHRRotateDegrees = [];
    let previousMoveX = null;
    let previousMoveY = null;
    let repeatMoveCount = 0;

    // set slider movement triggers //
    // this is based on bpm so must be done here instead of hand coded to allow for all map types
    let sliderMoveDuration = ((((60000 / mapBPM) * 4) / 1000) * 1).toFixed(2); // 64 blocks if 4, 1 = 16, currently on 1
    for (let gaming = 0; gaming < sliderBalls.length; gaming++) {
        let combinedL = [sliderBallStops[gaming], sliderBallSpawnsL[gaming], group(BPM_DATA_GROUP)];
        let combinedR = [sliderBallStops[gaming], sliderBallSpawnsR[gaming], group(BPM_DATA_GROUP)];
        $.add(
            object({
                OBJ_ID: MOVE_TRIGGER_ID,
                X: -260,
                Y: 650 - (gaming * 30),
                DURATION: sliderMoveDuration,
                TARGET: sliderBalls[gaming],
                USE_TARGET: true,
                TARGET_POS: sliderBallEndsL[gaming],
                TARGET_DIR_CENTER: sliderBalls[gaming], // center ID (top left of trigger)
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: combinedL
            })
        );
        $.add(
            object({
                OBJ_ID: MOVE_TRIGGER_ID,
                X: -230,
                Y: 650 - (gaming * 30),
                DURATION: sliderMoveDuration,
                TARGET: sliderBalls[gaming],
                USE_TARGET: true,
                TARGET_POS: sliderBallEndsR[gaming],
                TARGET_DIR_CENTER: sliderBalls[gaming], // center ID (top left of trigger)
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: combinedR
            })
        );
        $.add(
            object({
                OBJ_ID: MOVE_TRIGGER_ID,
                X: -200,
                Y: 650 - (gaming * 30),
                DURATION: sliderMoveDuration,
                TARGET: cursorGroup,
                USE_TARGET: true,
                TARGET_POS: sliderBallEndsL[gaming],
                TARGET_DIR_CENTER: cursorGroup, // center ID (top left of trigger)
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: combinedL
            })
        );
        $.add(
            object({
                OBJ_ID: MOVE_TRIGGER_ID,
                X: -170,
                Y: 650 - (gaming * 30),
                DURATION: sliderMoveDuration,
                TARGET: cursorGroup,
                USE_TARGET: true,
                TARGET_POS: sliderBallEndsR[gaming],
                TARGET_DIR_CENTER: cursorGroup, // center ID (top left of trigger)
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: combinedR
            })
        );
    }

    // function to convert timing points (slidervelocityunlimited) into useable slider velocity values based on most recent ms timing point //
    const getCurrentSliderVelocity = (hitObjectTime, timingPointsArray) => {
        let currentSliderVelocity = sliderMulti;
        for (let i = 0; i < timingPointsArray.length; i++) {
            if (timingPointsArray[i][0] <= hitObjectTime) {
                currentSliderVelocity = timingPointsArray[i][1];
            } else {
                break;
            }
        }
        return currentSliderVelocity;
    };

    console.log(`Hit Objects:`);
    let firstObject = true;
    // loop through all hit objects //
    for (let index = 0; index < beatmap.hitObjects.length; index++) {
        const hitObject = beatmap.hitObjects[index];
        const nextHitObject = beatmap.hitObjects[index + 1];
        const isNextNewCombo = nextHitObject && nextHitObject.hitType & HitType.NewCombo;

        // Get the X Position to place the triggers (as they are spawned via spawn ordered)
        if (firstObject) {
            introOffset = hitObject.startTime;
        }
        const startingTime = hitObject.startTime;
        let x_pos = (startingTime / 1000) * X_VELOCITY_BPS * 30;
        x_pos = x_pos - (introOffset / 1000) * X_VELOCITY_BPS * 30;
        // preempt - mehWindow;
        let normalPrehitDistance = ((preempt - mehWindow) / 1000) * X_VELOCITY_BPS * 30;
        let ezPrehitDistance = ((preempt - mehWindowEZ) / 1000) * X_VELOCITY_BPS * 30;
        let hrPrehitDistance = ((preempt - mehWindowHR) / 1000) * X_VELOCITY_BPS * 30;
        let normalJudgementDuration = (mehWindow * 2) / 1000;
        let ezJudgementDuration = (mehWindowEZ * 2) / 1000;
        let hrJudgementDuration = (mehWindowHR * 2) / 1000;
        let fadeInOffset = 400;

        let normalGroups = [mapGroup, group(1589)];
        let hrGroups = [mapGroup, group(1590)];

        // steps to manually do note stacking, so they slightly offset per note
        let move_x = hitObject.startX;
        let move_y = -hitObject.startY;
        let move_yHR = -(384 - hitObject.startY);
        if (previousMoveX === move_x && previousMoveY === move_y) {
            repeatMoveCount += stackOffset;;
            move_x += repeatMoveCount;
            move_y += repeatMoveCount;
            move_yHR -= repeatMoveCount;
        } else {
            repeatMoveCount = 0;
        }

        // first object starts hp drain, and enables controls
        if (firstObject) {
            $.add(
                object({
                    OBJ_ID: SPAWN_TRIGGER_ID,
                    X: x_pos,
                    Y: 45,
                    TARGET: group(1477),
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    // enables keystrokes
                    OBJ_ID: TOGGLE_TRIGGER_ID,
                    X: x_pos,
                    Y: 15,
                    TARGET: group(1388),
                    56: true, // is toggle on checked
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    // enables controls
                    OBJ_ID: TOGGLE_TRIGGER_ID,
                    X: x_pos,
                    Y: 30,
                    TARGET: group(1141),
                    56: true, // is toggle on checked
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            let firstCenter = group(1345);
            if (hitObject.hitType && hitObject.hitType & HitType.Normal) {
                firstCenter = group(156);
            } else if (hitObject.hitType && hitObject.hitType & HitType.Slider) {
                firstCenter = group(43);
            } else if (hitObject.hitType && hitObject.hitType & HitType.Spinner) {
                firstCenter = group(417);
            }
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: (((50) / 1000) * X_VELOCITY_BPS * 30),
                    Y: 515,
                    DURATION: ((preempt - perfectWindow) - 50) / 1000,
                    TARGET: group(107),
                    USE_TARGET: true,
                    TARGET_POS: firstCenter,
                    TARGET_DIR_CENTER: group(107), // center ID (top left of trigger)
                    EASING: 1, // ease in out (for now)
                    EDITOR_LAYER_1: 6,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            firstObjectPos = x_pos;
            firstObjectTime = hitObject.startTime;
            firstObject = false;
        }

        // get and set hitsounds
        let sampleSet = "None";
        let additionSet = "None";
        let customIndex = 0;
        let volume = 0;
        hitObject.samples.forEach(sample => {
            sampleSet = sample.sampleSet;
            additionSet = sample.hitSound;
            customIndex = sample.customIndex;
            volume = sample.volume;
        });
        if (customIndex != 0) {
            customIndex = 0;
        }

        let currentSamplePointIndex = 0;
        // find the current samplePoint to refrence if values are 0
        for (let i = 0; i < samplePointsArray.length; i++) {
            if ((samplePointsArray[i][0] - introOffset) <= startingTime) {
                currentSamplePointIndex = i;
            } else {
                break;
            }
        }

        if (currentSamplePointIndex == 0) {
            sampleSet = "Normal";
            volume = 50;
        }
        if (sampleSet == "None") {
            sampleSet = samplePointsArray[currentSamplePointIndex][1];
        }
        if (additionSet == "None") {
            additionSet = sampleSet;
        }
        if (volume == 0) {
            volume = samplePointsArray[currentSamplePointIndex][3];
        }
        volume = Math.round(volume / 25) * 25; // 478

        let sampleSetInt = 1; // 476
        if (sampleSet == "Normal") {
            sampleSetInt = 1;
        } else if (sampleSet == "Drum") {
            sampleSetInt = 2;
        } else if (sampleSet == "Soft") {
            sampleSetInt = 3;
        }
        let additionSetInt = 1; // 477
        if (additionSet == "Normal") {
            additionSetInt = 1;
        } else if (additionSet == "Drum") {
            additionSetInt = 2;
        } else if (additionSet == "Soft") {
            additionSetInt = 3;
        }

        // IF object is a circle
        if (hitObject.hitType & HitType.Normal) {
            let circleMove = circleMoves.next();
            let circleSpawn = circleSpawns.next();
            let circleJudgementBar = circleJudgementBars.next();
            let circleJudgementStopGroup = circleJudgementStopGroups.next();

            // place pickup trigger - IF a new combo
            if (isNextNewCombo) {
                $.add(
                    object({
                        OBJ_ID: PICKUP_TRIGGER_ID,
                        X: x_pos - 5,
                        Y: 260,
                        ITEM: 16,
                        COUNT: 1,
                        OVERRIDE_COUNT: true,
                        SPAWN_TRIGGERED: true,
                        MULTI_TRIGGER: true,
                        GROUPS: mapGroup
                    })
                );
                totalCombos += 1;
            }
            // place move trigger - location
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos,
                    Y: 230,
                    DURATION: 0,
                    MOVE_X: move_x,
                    MOVE_Y: move_y,
                    TARGET: circleMove,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    SILENT: true,
                    SMALL_STEP: true,
                    GROUPS: normalGroups
                })
            );
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos,
                    Y: 230,
                    DURATION: 0,
                    MOVE_X: move_x,
                    MOVE_Y: move_yHR,
                    TARGET: circleMove,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    EDITOR_LAYER_1: true,
                    SILENT: true,
                    SMALL_STEP: true,
                    GROUPS: hrGroups
                })
            );
            previousMoveX = hitObject.startX;
            previousMoveY = -hitObject.startY;
            // place pickup trigger - hitsounds
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos - 1,
                    Y: 200,
                    ITEM: 80,
                    COUNT: hitObject.hitSound,
                    OVERRIDE_COUNT: true,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos - 1,
                    Y: 200,
                    ITEM: 476,
                    COUNT: sampleSetInt,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 1,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos - 1,
                    Y: 200,
                    ITEM: 477,
                    COUNT: additionSetInt,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 2,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos - 1,
                    Y: 200,
                    ITEM: 478,
                    COUNT: volume,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 3,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            // place spawn trigger - spawn the circle
            $.add(
                object({
                    OBJ_ID: SPAWN_TRIGGER_ID,
                    X: x_pos,
                    Y: 170,
                    TARGET: circleSpawn,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            // place move trigger - move the visual judgement bar across
            let normalCircleJudgementBarGroups = [mapGroup, circleJudgementStopGroup, group(420)];
            let ezCircleJudgementBarGroups = [mapGroup, circleJudgementStopGroup, group(421)];
            let hrCircleJudgementBarGroups = [mapGroup, circleJudgementStopGroup, group(422)];
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos + normalPrehitDistance,
                    Y: 140,
                    DURATION: normalJudgementDuration,
                    TARGET: circleJudgementBar,
                    USE_TARGET: true,
                    TARGET_POS: group(1431),
                    TARGET_DIR_CENTER: circleJudgementBar, // center ID (top left of trigger)
                    TARGET_POS_AXES: 1, // 1 is x only, 2 is y only (101 index)
                    EDITOR_LAYER_1: 4,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: normalCircleJudgementBarGroups
                })
            );
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos + ezPrehitDistance,
                    Y: 110,
                    DURATION: ezJudgementDuration,
                    TARGET: circleJudgementBar,
                    USE_TARGET: true,
                    TARGET_POS: group(1431),
                    TARGET_DIR_CENTER: circleJudgementBar, // center ID (top left of trigger)
                    TARGET_POS_AXES: 1, // 1 is x only, 2 is y only (101 index)
                    EDITOR_LAYER_1: 4,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: ezCircleJudgementBarGroups
                })
            );
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos + hrPrehitDistance,
                    Y: 80,
                    DURATION: hrJudgementDuration,
                    TARGET: circleJudgementBar,
                    USE_TARGET: true,
                    TARGET_POS: group(1431),
                    TARGET_DIR_CENTER: circleJudgementBar, // center ID (top left of trigger)
                    TARGET_POS_AXES: 1, // 1 is x only, 2 is y only (101 index)
                    EDITOR_LAYER_1: 4,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: hrCircleJudgementBarGroups
                })
            );
            //console.log(index, ') TYPE: CIRCLE added successfully!');
            //console.log('sound: ', hitObject.hitSound);
            //console.log('move: ', circleMove);
            //console.log('spawn: ', circleSpawn);
        }

        // IF object is a slider =================================================================
        else if (hitObject.hitType & HitType.Slider) {
            let sliderLengthCounter = sliderLengthCounters.next();
            let sliderLengthScaleTarget = sliderLengthScaleTargets.next();
            let sliderVelocityScaleTarget = sliderVelocityScaleTargets.next();
            let sliderReverseCounter = sliderReverseCounters.next();
            let sliderRotateTarget = sliderRotateTargets.next();
            let sliderCenter = sliderCenters.next();
            let sliderSpawn = sliderSpawns.next();
            let sliderJudgementBar = sliderJudgementBars.next();
            let sliderJudgementStopGroup = sliderJudgementStopGroups.next();

            let msBPM = 60000 / mapBPM / 4;
            let lengthVal = (hitObject.duration / msBPM / (hitObject.repeats + 1)).toFixed(3);
            //console.log(msBPM, hitObject.duration, lengthVal);

            let path = hitObject.path.path;
            let start = path[0];
            let end = path[path.length - 1];
            let degrees = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
            let degreesHR = (Math.atan2(start.y - end.y, end.x - start.x) * 180) / Math.PI;
            Math.round(degrees);
            Math.round(degreesHR); // reduces bugs with annoying numbers,
            // nobody will care about 12.03 degrees instead of 12.00 lol
            let currentSliderVelocity = getCurrentSliderVelocity(startingTime, timingPointsArray);
            let velocityScale = (
                ((hitObject.velocity * 100) / 120) *
                (currentSliderVelocity * sliderMulti)
            ).toFixed(3);
            //let velocityScale = (currentSliderVelocity * sliderMulti).toFixed(3);

            // undo previous placements if they exist
            const scaleLengthIndex = previousLengthScaleValues.findIndex(
                entry => entry.target === sliderLengthScaleTarget
            );
            const scaleVelocityIndex = previousVelocityScaleValues.findIndex(
                entry => entry.target === sliderVelocityScaleTarget
            );
            const rotateIndex = previousRotateDegrees.findIndex(entry => entry.target === sliderRotateTarget);
            const rotateHRIndex = previousHRRotateDegrees.findIndex(entry => entry.target === sliderRotateTarget);
            if (scaleLengthIndex !== -1) {
                $.add(
                    object({
                        OBJ_ID: SCALE_TRIGGER_ID,
                        X: x_pos - 45,
                        Y: 600,
                        DURATION: 0,
                        TARGET: sliderLengthScaleTarget,
                        CENTER: sliderCenter,
                        SCALE_X_BY: previousLengthScaleValues[scaleLengthIndex].scale,
                        DIV_BY_X: true,
                        SPAWN_TRIGGERED: true,
                        MULTI_TRIGGER: true,
                        GROUPS: mapGroup
                    })
                );
                //console.log(`Target ${sliderLengthScaleTarget} found in scale array.`);
                previousLengthScaleValues.splice(scaleLengthIndex, 1);
            }
            if (scaleVelocityIndex !== -1) {
                $.add(
                    object({
                        OBJ_ID: SCALE_TRIGGER_ID,
                        X: x_pos - 60,
                        Y: 575,
                        DURATION: 0,
                        TARGET: sliderVelocityScaleTarget,
                        CENTER: sliderCenter,
                        SCALE_X_BY: previousVelocityScaleValues[scaleVelocityIndex].scale,
                        DIV_BY_X: true,
                        SPAWN_TRIGGERED: true,
                        MULTI_TRIGGER: true,
                        GROUPS: mapGroup
                    })
                );
                //console.log(`Target ${sliderVelocityScaleTarget} found in scale array.`);
                previousVelocityScaleValues.splice(scaleVelocityIndex, 1);
            }
            if (rotateIndex !== -1) {
                $.add(
                    object({
                        OBJ_ID: ROTATE_TRIGGER_ID,
                        X: x_pos - 75,
                        Y: 550,
                        DURATION: 0,
                        ROTATE_DEGREES: -previousRotateDegrees[rotateIndex].degrees,
                        TARGET: sliderRotateTarget,
                        CENTER: sliderCenter,
                        SPAWN_TRIGGERED: true,
                        MULTI_TRIGGER: true,
                        GROUPS: normalGroups
                    })
                );
                //console.log(`Target ${sliderRotateTarget} found in rotate array.`);
                previousRotateDegrees.splice(rotateIndex, 1);
            }
            if (rotateHRIndex !== -1) {
                $.add(
                    object({
                        OBJ_ID: ROTATE_TRIGGER_ID,
                        X: x_pos - 75,
                        Y: 550,
                        DURATION: 0,
                        ROTATE_DEGREES: -previousHRRotateDegrees[rotateHRIndex].degrees,
                        TARGET: sliderRotateTarget,
                        CENTER: sliderCenter,
                        SPAWN_TRIGGERED: true,
                        MULTI_TRIGGER: true,
                        EDITOR_LAYER_1: 1,
                        GROUPS: hrGroups
                    })
                );
                //console.log(`Target ${sliderRotateTarget} found in rotate array.`);
                previousHRRotateDegrees.splice(rotateHRIndex, 1);
            }

            // place pickup trigger - IF a new combo
            if (isNextNewCombo) {
                $.add(
                    object({
                        OBJ_ID: PICKUP_TRIGGER_ID,
                        X: x_pos - 5,
                        Y: 510,
                        ITEM: 16,
                        COUNT: 1,
                        OVERRIDE_COUNT: true,
                        SPAWN_TRIGGERED: true,
                        MULTI_TRIGGER: true,
                        GROUPS: mapGroup
                    })
                );
                totalCombos += 1;
            }
            // place itemedit trigger - length
            $.add(
                object({
                    OBJ_ID: ITEM_EDIT_TRIGGER_ID,
                    X: x_pos,
                    Y: 480,
                    ITEM_ID_1: 79,
                    TYPE_1: TIMER,
                    ITEM_TARGET: sliderLengthCounter,
                    ITEM_TARGET_TYPE: TIMER,
                    MOD: lengthVal,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            // place scale trigger - length
            $.add(
                object({
                    OBJ_ID: SCALE_TRIGGER_ID,
                    X: x_pos - 30,
                    Y: 450,
                    DURATION: 0,
                    TARGET: sliderLengthScaleTarget,
                    CENTER: sliderCenter,
                    SCALE_X_BY: lengthVal,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            previousLengthScaleValues.push({
                target: sliderLengthScaleTarget,
                scale: lengthVal
            });
            // place scale trigger - velocity
            $.add(
                object({
                    OBJ_ID: SCALE_TRIGGER_ID,
                    X: x_pos - 15,
                    Y: 420,
                    DURATION: 0,
                    TARGET: sliderVelocityScaleTarget,
                    CENTER: sliderCenter,
                    SCALE_X_BY: velocityScale,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            previousVelocityScaleValues.push({
                target: sliderVelocityScaleTarget,
                scale: velocityScale
            });
            // place itemedit trigger - reverse count
            $.add(
                object({
                    OBJ_ID: ITEM_EDIT_TRIGGER_ID,
                    X: x_pos,
                    Y: 390,
                    ITEM_TARGET: sliderReverseCounter,
                    ITEM_TARGET_TYPE: TIMER,
                    MOD: hitObject.repeats,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            // place move trigger - location
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos,
                    Y: 360,
                    DURATION: 0,
                    MOVE_X: move_x,
                    MOVE_Y: move_y,
                    TARGET: sliderRotateTarget,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    SILENT: true,
                    SMALL_STEP: true,
                    GROUPS: normalGroups
                })
            );
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos,
                    Y: 360,
                    DURATION: 0,
                    MOVE_X: move_x,
                    MOVE_Y: move_yHR,
                    TARGET: sliderRotateTarget,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    EDITOR_LAYER_1: true,
                    SILENT: true,
                    SMALL_STEP: true,
                    GROUPS: hrGroups
                })
            );
            previousMoveX = hitObject.startX;
            previousMoveY = -hitObject.startY;
            // place rotate trigger - direction
            $.add(
                object({
                    OBJ_ID: ROTATE_TRIGGER_ID,
                    X: x_pos,
                    Y: 330,
                    DURATION: 0,
                    ROTATE_DEGREES: degrees,
                    TARGET: sliderRotateTarget,
                    CENTER: sliderCenter,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: normalGroups
                })
            );
            previousRotateDegrees.push({
                target: sliderRotateTarget,
                degrees: degrees
            });
            $.add(
                object({
                    OBJ_ID: ROTATE_TRIGGER_ID,
                    X: x_pos,
                    Y: 330,
                    DURATION: 0,
                    ROTATE_DEGREES: degreesHR,
                    TARGET: sliderRotateTarget,
                    CENTER: sliderCenter,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    EDITOR_LAYER_1: 1,
                    GROUPS: hrGroups
                })
            );
            previousHRRotateDegrees.push({
                target: sliderRotateTarget,
                degrees: degreesHR
            });
            // place pickup trigger - hitsounds
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos - 1,
                    Y: 300,
                    ITEM: 80,
                    COUNT: hitObject.hitSound,
                    OVERRIDE_COUNT: true,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos - 1,
                    Y: 300,
                    ITEM: 476,
                    COUNT: sampleSetInt,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 1,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos - 1,
                    Y: 300,
                    ITEM: 477,
                    COUNT: additionSetInt,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 2,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos - 1,
                    Y: 300,
                    ITEM: 478,
                    COUNT: volume,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 3,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            // place spawn trigger - spawn the slider
            $.add(
                object({
                    OBJ_ID: SPAWN_TRIGGER_ID,
                    X: x_pos,
                    Y: 270,
                    TARGET: sliderSpawn,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            // place move trigger - move the visual judgement bar across
            let normalSliderJudgementBarGroups = [mapGroup, sliderJudgementStopGroup, group(420)];
            let ezSliderJudgementBarGroups = [mapGroup, sliderJudgementStopGroup, group(421)];
            let hrSliderJudgementBarGroups = [mapGroup, sliderJudgementStopGroup, group(422)];
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos + normalPrehitDistance,
                    Y: 240,
                    DURATION: normalJudgementDuration,
                    TARGET: sliderJudgementBar,
                    USE_TARGET: true,
                    TARGET_POS: group(1431),
                    TARGET_DIR_CENTER: sliderJudgementBar, // center ID (top left of trigger)
                    TARGET_POS_AXES: 1, // 1 is x only, 2 is y only (101 index)
                    EDITOR_LAYER_1: 4,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: normalSliderJudgementBarGroups
                })
            );
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos + ezPrehitDistance,
                    Y: 210,
                    DURATION: ezJudgementDuration,
                    TARGET: sliderJudgementBar,
                    USE_TARGET: true,
                    TARGET_POS: group(1431),
                    TARGET_DIR_CENTER: sliderJudgementBar, // center ID (top left of trigger)
                    TARGET_POS_AXES: 1, // 1 is x only, 2 is y only (101 index)
                    EDITOR_LAYER_1: 4,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: ezSliderJudgementBarGroups
                })
            );
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: x_pos + hrPrehitDistance,
                    Y: 180,
                    DURATION: hrJudgementDuration,
                    TARGET: sliderJudgementBar,
                    USE_TARGET: true,
                    TARGET_POS: group(1431),
                    TARGET_DIR_CENTER: sliderJudgementBar, // center ID (top left of trigger)
                    TARGET_POS_AXES: 1, // 1 is x only, 2 is y only (101 index)
                    EDITOR_LAYER_1: 4,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: hrSliderJudgementBarGroups
                })
            );
            //console.log(index, ') TYPE: SLIDER added successfully!');
            //console.log('Duration: ', hitObject.duration);
            //console.log('LengthMod: ', lengthVal);
            //console.log('Base Velocity: ', hitObject.velocity);
            //console.log('OG Test: ', (((hitObject.velocity * 100) / 120) * sliderMulti));
            //console.log('Updated Values: ', velocityScale);
            //console.log('Repeats: ', hitObject.repeats);
            //console.log('Degrees: ', degrees);
            //console.log('CENTER MODE: ', sliderCenter);
        }

        // IF type is spinner
        else if (hitObject.hitType & HitType.Spinner) {
            fadeInOffset = (400 / 1000) * X_VELOCITY_BPS * 30; // 400ms fade in (0.4 in alpha trigger), must be accounted for
            // place itemedit trigger - duration
            $.add(
                object({
                    OBJ_ID: ITEM_EDIT_TRIGGER_ID,
                    X: x_pos + preemptPos - fadeInOffset,
                    Y: 110,
                    ITEM_TARGET: 483,
                    ITEM_TARGET_TYPE: TIMER,
                    MOD: hitObject.duration,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            // place pickup trigger - hitsounds
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos + preemptPos - fadeInOffset - 1,
                    Y: 80,
                    ITEM: 80,
                    COUNT: hitObject.hitSound,
                    OVERRIDE_COUNT: true,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos + preemptPos - fadeInOffset - 1,
                    Y: 80,
                    ITEM: 476,
                    COUNT: sampleSetInt,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 1,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos + preemptPos - fadeInOffset - 1,
                    Y: 80,
                    ITEM: 477,
                    COUNT: additionSetInt,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 2,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            $.add(
                object({
                    OBJ_ID: PICKUP_TRIGGER_ID,
                    X: x_pos + preemptPos - fadeInOffset - 1,
                    Y: 80,
                    ITEM: 478,
                    COUNT: volume,
                    OVERRIDE_COUNT: true,
                    EDITOR_LAYER_1: 3,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
            // place spawn trigger - spawn the spinner
            $.add(
                object({
                    OBJ_ID: SPAWN_TRIGGER_ID,
                    X: x_pos + preemptPos - fadeInOffset,
                    Y: 50,
                    TARGET: group(1499),
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );

            let spinnerEndPos = ((hitObject.endTime - introOffset) / 1000) * X_VELOCITY_BPS * 30;
            // place spawn trigger - end the spinner
            $.add(
                object({
                    OBJ_ID: SPAWN_TRIGGER_ID,
                    X: spinnerEndPos + preemptPos,
                    Y: 50,
                    TARGET: group(1500),
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
        } else {
            console.log(index, ') TYPE: UNKNOWN not added! What the hell even is this?');
        }

        // timings for cursor
        let nextEntryTime = 999999;
        let cursorMovementPos = 0;
        let objCenterGroup = 9998;
        let cursorMovementDuration = 0;
        //console.log('--------------------------------------------');
        //console.log('OBJECT',index,);

        // get the time the cursor needs to leave the object. this can't be earlier than the next object spawns due to gd limitations.
        let exitTime = hitObject.startTime + preempt + perfectWindow;
        if (hitObject.hitType && hitObject.hitType & HitType.Slider) {
            exitTime = hitObject.startTime + preempt + hitObject.duration;
        }
        if (nextHitObject) {
            if (exitTime <= (nextHitObject.startTime + 5)) {
                exitTime = (nextHitObject.startTime + 5);
            }
        }
        if (hitObject.hitType && hitObject.hitType & HitType.Spinner) {
            //exitTime = hitObject.startTime + fadeInOffset + hitObject.duration;
            exitTime = hitObject.endTime + preempt;
        }
        //console.log('start:',exitTime);

        // what time the cursor needs to stop at
        if (nextHitObject) {
            nextEntryTime = nextHitObject.startTime + preempt - perfectWindow;
            //console.log('stop:',nextEntryTime);

            // time it takes the cursor to travel from the start to the stop
            cursorMovementDuration = nextEntryTime - exitTime;
            //console.log('duration:',cursorMovementDuration);

            // where group should we move
            if (nextHitObject.hitType && nextHitObject.hitType & HitType.Normal) {
                objCenterGroup = circleMoves.next();
                circleMoves.prev();
            } else if (nextHitObject.hitType && nextHitObject.hitType & HitType.Slider) {
                objCenterGroup = sliderCenters.next();
                sliderCenters.prev();
            } else if (nextHitObject.hitType && nextHitObject.hitType & HitType.Spinner) {
                objCenterGroup = group(417);
            }
            //console.log('group:',objCenterGroup);

            // where on the x axis to start moving. this is based on the end of the previous note.
            cursorMovementPos = (((exitTime) / 1000) * X_VELOCITY_BPS * 30);
            //console.log('x_axis:',cursorMovementPos);
        }

        if ((cursorMovementDuration < 99999) && (objCenterGroup != 9998)) {
            // { ELASTIC_OUT: 6, BACK_IN_OUT: 16, BOUNCE_IN: 8, BACK_OUT: 18, EASE_OUT: 3, EASE_IN: 2, EASE_IN_OUT: 1,
            // ELASTIC_IN_OUT: 4, BOUNCE_OUT: 9, EXPONENTIAL_IN: 11, EXPONENTIAL_OUT: 12, SINE_IN_OUT: 13, BOUNCE_IN_OUT: 7,
            // SINE_IN: 14, ELASTIC_IN: 5, SINE_OUT: 15, EXPONENTIAL_IN_OUT: 10, BACK_IN: 17, NONE: 0, };
            $.add(
                object({
                    OBJ_ID: MOVE_TRIGGER_ID,
                    X: cursorMovementPos - (((introOffset) / 1000) * X_VELOCITY_BPS * 30),
                    Y: 515,
                    DURATION: cursorMovementDuration / 1000,
                    TARGET: group(107),
                    USE_TARGET: true,
                    TARGET_POS: objCenterGroup,
                    TARGET_DIR_CENTER: group(107), // center ID (top left of trigger)
                    EASING: 1, // ease in out (for now)
                    EDITOR_LAYER_1: 4,
                    SPAWN_TRIGGERED: true,
                    MULTI_TRIGGER: true,
                    GROUPS: mapGroup
                })
            );
        }
    }
    //console.log('--------------------------------------------');

    // place move trigger - bar visual on bottom of screen, messy but idc
    let normalODGroups = [mapGroup, group(420)];
    let ezODGroups = [mapGroup, group(421)];
    let hrODGroups = [mapGroup, group(422)];
    let normalJudgementMulti = 210 / mehWindow; // 210 for 7 blocks
    let ezJudgementMulti = 210 / mehWindowEZ;
    let hrJudgementMulti = 210 / mehWindowHR;
    // normal OD
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 520,
            DURATION: 0,
            MOVE_X: -perfectWindow * normalJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1130),
            EDITOR_LAYER_1: 0,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: normalODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 490,
            DURATION: 0,
            MOVE_X: -goodWindow * normalJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1129),
            EDITOR_LAYER_1: 0,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: normalODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 460,
            DURATION: 0,
            MOVE_X: -mehWindow * normalJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1134),
            EDITOR_LAYER_1: 0,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: normalODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 550,
            DURATION: 0,
            MOVE_X: perfectWindow * normalJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1131),
            EDITOR_LAYER_1: 0,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: normalODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 580,
            DURATION: 0,
            MOVE_X: goodWindow * normalJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1132),
            EDITOR_LAYER_1: 0,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: normalODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 610,
            DURATION: 0,
            MOVE_X: mehWindow * normalJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1133),
            EDITOR_LAYER_1: 0,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: normalODGroups
        })
    );
    // ez OD
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 520,
            DURATION: 0,
            MOVE_X: -perfectWindowEZ * ezJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1130),
            EDITOR_LAYER_1: 1,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: ezODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 490,
            DURATION: 0,
            MOVE_X: -goodWindowEZ * ezJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1129),
            EDITOR_LAYER_1: 1,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: ezODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 460,
            DURATION: 0,
            MOVE_X: -mehWindowEZ * ezJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1134),
            EDITOR_LAYER_1: 1,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: ezODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 550,
            DURATION: 0,
            MOVE_X: perfectWindowEZ * ezJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1131),
            EDITOR_LAYER_1: 1,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: ezODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 580,
            DURATION: 0,
            MOVE_X: goodWindowEZ * ezJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1132),
            EDITOR_LAYER_1: 1,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: ezODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 610,
            DURATION: 0,
            MOVE_X: mehWindowEZ * ezJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1133),
            EDITOR_LAYER_1: 1,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: ezODGroups
        })
    );
    // hr OD
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 520,
            DURATION: 0,
            MOVE_X: -perfectWindowHR * hrJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1130),
            EDITOR_LAYER_1: 2,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: hrODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 490,
            DURATION: 0,
            MOVE_X: -goodWindowHR * hrJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1129),
            EDITOR_LAYER_1: 2,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: hrODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 460,
            DURATION: 0,
            MOVE_X: -mehWindowHR * hrJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1134),
            EDITOR_LAYER_1: 2,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: hrODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 550,
            DURATION: 0,
            MOVE_X: perfectWindowHR * hrJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1131),
            EDITOR_LAYER_1: 2,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: hrODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 580,
            DURATION: 0,
            MOVE_X: goodWindowHR * hrJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1132),
            EDITOR_LAYER_1: 2,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: hrODGroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: -120,
            Y: 610,
            DURATION: 0,
            MOVE_X: mehWindowHR * hrJudgementMulti,
            MOVE_Y: 0,
            TARGET: group(1133),
            EDITOR_LAYER_1: 2,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SILENT: true,
            SMALL_STEP: true,
            GROUPS: hrODGroups
        })
    );
    // spawn em lets go WWWW
    $.add(
        object({
            OBJ_ID: SPAWN_TRIGGER_ID,
            X: -95,
            Y: 430,
            TARGET: group(1447),
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );

    // stops hp drain, and disables controls at the end of the map
    let endOffset = ((beatmap.totalLength - introOffset) / 1000) * X_VELOCITY_BPS * 30;
    let endShift = preemptPos + (((mehWindow * 2) / 1000) * X_VELOCITY_BPS * 30);
    $.add(
        object({
            OBJ_ID: SPAWN_TRIGGER_ID,
            X: endOffset + endShift,
            Y: 60,
            TARGET: group(1498),
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            // enable controls
            OBJ_ID: TOGGLE_TRIGGER_ID,
            X: endOffset + endShift,
            Y: 30,
            TARGET: group(1388),
            56: false, // is toggle on checked
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            OBJ_ID: SPAWN_TRIGGER_ID,
            X: endOffset + endShift,
            Y: 0,
            TARGET: group(1517),
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );

    // get health reading points
    let healthPointMS = ((mapLength - firstObjectTime) / 60); // 60 points total
    let healthPointsArray = [];
    for (let cool = 0; cool < 60; cool++) {
        let nextHealthTime = (healthPointMS * (cool + 1)) + firstObjectTime;
        for (let cooler = 0; cooler < breakPointsArray.length; cooler++) {
            if (nextHealthTime > breakPointsArray[cooler][0]) {
                nextHealthTime = nextHealthTime + (breakPointsArray[cooler][1] - breakPointsArray[cooler][0]);
            }
        }
        healthPointsArray.push(nextHealthTime);
    }
    // place the reading points
    for (let evenCooler = 0; evenCooler < healthPointsArray.length; evenCooler++) {
        let nextHealthPos = ((healthPointsArray[evenCooler] - introOffset) / 1000) * X_VELOCITY_BPS * 30;
        //console.log(nextHealthPos);
        $.add(
            object({
                OBJ_ID: SPAWN_TRIGGER_ID,
                X: nextHealthPos,
                Y: 15,
                TARGET: group(1577),
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: mapGroup
            })
        );
    }

    // visual timer circle
    $.add(
        object({
            OBJ_ID: ROTATE_TRIGGER_ID,
            X: firstObjectPos,
            Y: 650,
            DURATION: ((beatmap.totalLength - introOffset) / 1000) / 2,
            ROTATE_DEGREES: 180,
            TARGET: group(195),
            CENTER: group(197),
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            OBJ_ID: SPAWN_TRIGGER_ID,
            X: firstObjectPos,
            Y: 620,
            TARGET: group(223),
            SPAWN_DURATION: (((beatmap.totalLength - introOffset) / 1000) / 2).toFixed(2),
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );
    $.add(
        object({
            OBJ_ID: ROTATE_TRIGGER_ID,
            X: firstObjectPos + 30,
            Y: 650,
            DURATION: ((beatmap.totalLength - introOffset) / 1000) / 2,
            ROTATE_DEGREES: 180,
            TARGET: group(195),
            CENTER: group(197),
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: timerSpawnGroup
        })
    );
    $.add(
        object({
            OBJ_ID: TOGGLE_TRIGGER_ID,
            X: firstObjectPos + 30,
            Y: 620,
            TARGET: group(208),
            56: false, // is toggle on checked
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: timerSpawnGroup
        })
    );
    $.add(
        object({
            OBJ_ID: TOGGLE_TRIGGER_ID,
            X: firstObjectPos + 30,
            Y: 590,
            TARGET: group(209),
            56: true, // is toggle on checked
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: timerSpawnGroup
        })
    );

    // hp drain code and such and soforth
    let normalHPDgroups = [group(1477), group(1691)];
    let ezHPDgroups = [group(1477), group(1692)];
    let hrHPDgroups = [group(1477), group(1693)];
    if (hpDrain < 0.1) {
        hpDrain = 0.1;
    }
    let drainMoveTime = ((mapObjCount / totalCombos) / (hpDrain * 2.5)) * 30;
    let drainLengthMultiplier = (mapLength / 1000) / drainMoveTime;
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: 0,
            Y: 550,
            DURATION: drainMoveTime * drainLengthMultiplier,
            MOVE_X: -200 * drainLengthMultiplier,
            MOVE_Y: 0,
            TARGET: group(1475), // hp bar and collisions
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            SMALL_STEP: true,
            GROUPS: normalHPDgroups
        })
    );
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: 0,
            Y: 550,
            DURATION: drainMoveTime * drainLengthMultiplier,
            MOVE_X: (-200 * drainLengthMultiplier) / 2,
            MOVE_Y: 0,
            TARGET: group(1475), // hp bar and collisions
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            EDITOR_LAYER_1: 1,
            SMALL_STEP: true,
            GROUPS: ezHPDgroups
        })
    );
    let hrDrainDist = ((-200 * drainLengthMultiplier) * 1.3);
    if (hrDrainDist > 10) {
        hrDrainDist = 10
    }
    $.add(
        object({
            OBJ_ID: MOVE_TRIGGER_ID,
            X: 0,
            Y: 550,
            DURATION: drainMoveTime * drainLengthMultiplier,
            MOVE_X: hrDrainDist,
            MOVE_Y: 0,
            TARGET: group(1475), // hp bar and collisions
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            EDITOR_LAYER_1: 2,
            SMALL_STEP: true,
            GROUPS: hrHPDgroups
        })
    );
    //console.log(drainMoveTime, drainLengthMultiplier, drainMoveTime * drainLengthMultiplier, -200 * drainLengthMultiplier);

    // kiai timeline placement
    for (let epicGaming = 0; epicGaming < effectPointsArray.length; epicGaming++) {
        let kiaiPointPos = ((effectPointsArray[epicGaming][0] - introOffset) / 1000) * X_VELOCITY_BPS * 30;
        if (effectPointsArray[epicGaming][1]) {
            kiai = 1
        } else {
            kiai = 0
        };
        $.add(
            object({
                OBJ_ID: PICKUP_TRIGGER_ID,
                X: kiaiPointPos - 1,
                Y: 50,
                ITEM: 489,
                COUNT: kiai,
                OVERRIDE_COUNT: true,
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: mapGroup
            })
        );
        $.add(
            object({
                OBJ_ID: SPAWN_TRIGGER_ID,
                X: kiaiPointPos,
                Y: 20,
                TARGET: group(1497),
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: mapGroup
            })
        );
    }

    // break timeline placement
    for (let moreEpicGaming = 0; moreEpicGaming < breakPointsArray.length; moreEpicGaming++) {
        let breakPointStartPos = ((((breakPointsArray[moreEpicGaming][0] - introOffset) + 500) / 1000) * X_VELOCITY_BPS * 30); // 250 offset because why not
        let breakPointEndPos = (((breakPointsArray[moreEpicGaming][1] - introOffset) / 1000) * X_VELOCITY_BPS * 30);
        $.add(
            object({
                OBJ_ID: PICKUP_TRIGGER_ID,
                X: breakPointStartPos - 1,
                Y: 110,
                ITEM: 487,
                COUNT: 1,
                OVERRIDE_COUNT: true,
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: mapGroup
            })
        );
        $.add(
            object({
                OBJ_ID: SPAWN_TRIGGER_ID,
                X: breakPointStartPos,
                Y: 80,
                TARGET: group(1484),
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: mapGroup
            })
        );
        // end
        $.add(
            object({
                OBJ_ID: PICKUP_TRIGGER_ID,
                X: breakPointEndPos - 1,
                Y: 110,
                ITEM: 487,
                COUNT: 0,
                OVERRIDE_COUNT: true,
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: mapGroup
            })
        );
        $.add(
            object({
                OBJ_ID: SPAWN_TRIGGER_ID,
                X: breakPointEndPos,
                Y: 80,
                TARGET: group(1484),
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: mapGroup
            })
        );
        $.add(
            object({
                OBJ_ID: MOVE_TRIGGER_ID,
                X: breakPointStartPos + (0.25 * (X_VELOCITY_BPS * 30)),
                Y: 515,
                DURATION: 0.5,
                TARGET: group(107),
                USE_TARGET: true,
                TARGET_POS: group(1345),
                TARGET_DIR_CENTER: group(107), // center ID (top left of trigger)
                EASING: 1, // ease in out (for now)
                EDITOR_LAYER_1: 4,
                SPAWN_TRIGGERED: true,
                MULTI_TRIGGER: true,
                GROUPS: mapGroup
            })
        );
    }

    // load song
    let normalSpeedGroups = [mapGroup, group(1591)]; // channel 1
    let htSpeedGroups = [mapGroup, group(1582)]; // channel 2
    let dtSpeedGroups = [mapGroup, group(1583)]; // channel 3
    let normalSpeedSpawns = [songSpawnGroup, group(1591)]; // channel 1
    let htSpeedSpawns = [songSpawnGroup, group(1582)]; // channel 2
    let dtSpeedSpawns = [songSpawnGroup, group(1583)]; // channel 3
    $.add(
        object({
            OBJ_ID: SONG_TRIGGER_ID,
            X: -150 + 30,
            Y: 100,
            SONG_VOLUME: 1,
            SONG_ID: SONG_ID,
            PREP: true,
            408: introOffset, // start time
            SONG_SPEED: 0, // normal speed
            SONG_CHANNEL: 1,
            EDITOR_LAYER_1: 0,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: normalSpeedGroups
        })
    );
    $.add(
        object({
            OBJ_ID: SONG_TRIGGER_ID,
            X: -150 + 30,
            Y: 100,
            SONG_VOLUME: 1,
            SONG_ID: SONG_ID,
            PREP: true,
            408: introOffset, // start time
            SONG_SPEED: -5, // ht speed
            SONG_CHANNEL: 2,
            EDITOR_LAYER_1: 1,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: htSpeedGroups
        })
    );
    $.add(
        object({
            OBJ_ID: SONG_TRIGGER_ID,
            X: -150 + 30,
            Y: 100,
            SONG_VOLUME: 1,
            SONG_ID: SONG_ID,
            PREP: true,
            408: introOffset, // start time
            SONG_SPEED: 7, // dt speed
            SONG_CHANNEL: 3,
            EDITOR_LAYER_1: 2,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dtSpeedGroups
        })
    );
    // start song
    $.add(
        object({
            OBJ_ID: SONG_TRIGGER_ID,
            X: preemptPos,
            Y: 100,
            LOAD_PREP: true,
            SONG_CHANNEL: 1,
            EDITOR_LAYER_1: 0,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: normalSpeedSpawns
        })
    );
    $.add(
        object({
            OBJ_ID: SONG_TRIGGER_ID,
            X: preemptPos - ((5 / 1000) * (X_VELOCITY_BPS * 30)),
            Y: 100,
            LOAD_PREP: true,
            SONG_CHANNEL: 2,
            EDITOR_LAYER_1: 1,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: htSpeedSpawns
        })
    );
    $.add(
        object({
            OBJ_ID: SONG_TRIGGER_ID,
            X: preemptPos - ((10 / 1000) * (X_VELOCITY_BPS * 30)),
            Y: 100,
            LOAD_PREP: true,
            SONG_CHANNEL: 3,
            EDITOR_LAYER_1: 2,
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: dtSpeedSpawns
        })
    );

    $.add(
        object({
            OBJ_ID: SPAWN_TRIGGER_ID,
            X: preemptPos - ((480 / 1000) * (X_VELOCITY_BPS * 30)),
            Y: 70,
            TARGET: group(3059),
            SPAWN_TRIGGERED: true,
            MULTI_TRIGGER: true,
            GROUPS: mapGroup
        })
    );

    // move all triggers after they are placed
    let object_offset = (x = 0, y = 0) => {
        let contexts = Context.list;
        for (let i in contexts) {
            for (let j in contexts[i].objects) {
                if (!contexts[i].objects[j].X) {
                    contexts[i].objects[j].X = x;
                } else {
                    contexts[i].objects[j].X += x;
                }
                if (!contexts[i].objects[j].Y) {
                    contexts[i].objects[j].Y = y;
                } else {
                    contexts[i].objects[j].Y += y;
                }
            };
        };
    }

    object_offset(X_OFFSET, Y_OFFSET); // set in constants.js

    console.log(`------------------------`);
    console.log(`Beatmap MetaData:`);
    console.log(`beatmapID: ${mapID}`);
    console.log(`introOffset: ${introOffset}`);
    console.log(`previewTime: ${previewTime}`);
    console.log(`13/OD: ${overallDifficulty}`);
    console.log(`14/AR: ${approachRate}`);
    console.log(`60/CS: ${circleSize}`);
    console.log(`61/HPD: ${hpDrain}`);
    console.log(`T2D: ${drainMoveTime}`);
    console.log(`BPM: ${mapBPM}`);
    console.log(`LEN: ${mapLength / 1000} sec`);
    console.log(`BaseSliderMP: ${sliderMulti}`);
    console.log(`StarRating: ${STAR_DIFFICULTY}`);
    console.log(`OBJ: total=${mapObjCount}, circles=${circleCount}, sliders=${sliderCount}, spinners=${spinnerCount}`);
    console.log(`------------------------`);
    console.log(`o/`);
}

console.log('script fork running');
let args = process.argv.slice(2);
console.log('args', args);
args[0] = fs.readFileSync(args[0]).toString();
importOsu(...args);