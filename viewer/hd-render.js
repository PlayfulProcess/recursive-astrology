/* hd-render.js — the Human Design bodygraph and mandala, in one place.
   ============================================================================

   WHY THIS FILE EXISTS (6 Sep 2026)

   Until today the two drawings lived inline in viewer/astrology-viewer.html,
   with the framework tables beside them. The sibling recursive-iching site
   needed sixty-four "gate N lit" glyphs, could not import anything, so it
   copied the tables out and redrew the board — and the copy drifted: its
   centres and its channel routing were not the ones in this repo, which took
   a long time to get right. A copy always drifts. So the tables and the two
   renderers live here, exported, and everything else consumes them:

     viewer/astrology-viewer.html   the live chart (thin wrappers, same names)
     viewer/bodygraph.html          standalone page, ?gates= and Export SVG/PNG
     scripts/export-glyphs.js       writes img/hd/gate-01..64.svg under Node
     recursive-iching               consumes those files, deletes its generator

   THE CONTRACT (written out again in docs/HD-RENDER.md)

     renderBodygraph(activations, opts) -> SVG string
     renderMandala(activations, opts)   -> SVG string

   Both are pure: no document, no window, no module-scope chart state, so Node
   can require this file and call them. Everything they need arrives in the
   arguments — including the one thing that is NOT derivable from the tables,
   where the planets sit, which comes in as opts.planets.

   These functions return SVG and nothing else. The mandala's legend is HTML
   (utility classes and a real <button>), so it is a separate export —
   mandalaLegendHTML(opts) — rather than markup smuggled inside an SVG string.
   The bodygraph's legend is genuinely SVG and stays inside the drawing.

   NOT HERE, on purpose: the SELECTION layer. What the reader has tapped is
   stamped onto the finished DOM as .hd-focus / .focused by the viewer's
   applySelectionToHD() and read by CSS; it never touches the SVG string, so a
   tap never rebuilds the drawing and this module never has to know about it.
   The hooks it hangs off ARE emitted here and are part of the contract:
   classes hd-gate / hd-channel / hd-center / hd-hit / hd-layer-channels /
   hd-legend-sel, attributes data-hd-gate / data-hd-channel / data-hd-center /
   data-ch / data-act / data-def. Don't rename them without the CSS.

   COLOUR. The drawings paint in --bgc-* custom properties, which follow the
   host page's theme. A standalone .svg file has no host page, so opts.embedStyle
   writes the palette into the SVG itself (light, with dark under
   prefers-color-scheme). Same drawing either way.
   ========================================================================== */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HDRender = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // The wheel of 64 gates, in mandala order, starting from the one that
    // opens at 3°52'30" Aries. Each gate is exactly 5°37'30" (5.625°) of
    // ecliptic longitude, so every boundary is DERIVED below rather than
    // typed out — a hand-written table had gate 25 starting at 358.125°
    // instead of 358.25° (Jul 27 2026), which quietly moved every line
    // boundary inside gate 25 by an eighth of a degree.
    const HD_GATE_ORDER = [
        17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15,
        52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46,
        18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10,
        58, 38, 54, 61, 60, 41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25
    ];
    const HD_WHEEL_START = 3.875;   // ecliptic longitude where gate 17 opens
    const HD_GATE_ARC = 360 / 64;   // 5.625° — one hexagram
    const HD_LINE_ARC = HD_GATE_ARC / 6; // 0.9375° — one line

    // Gate sequence around the mandala (degrees in tropical zodiac)
    const HD_GATE_SEQUENCE = HD_GATE_ORDER.map((gate, i) => ({
        gate,
        start: (HD_WHEEL_START + i * HD_GATE_ARC) % 360
    }));

    // ------------------------------------------------------------
    // A NOTE ON THE WORDS BELOW (Aug 5 2026)
    //
    // Two different things live in this section, and they have to be
    // kept apart.
    //
    //   STRUCTURE is fact and free: which gate sits at which slice of
    //   ecliptic longitude, which hexagram it corresponds to, which
    //   gates pair into which channel, which centre a gate belongs to,
    //   and the rules that derive type / authority / profile from a
    //   chart. Any two implementations that get it right agree, the
    //   way two ephemerides agree. All of that is computed here.
    //
    //   PROSE is authorship. The gate names, keynotes and descriptions
    //   published by Jovian Archive are Ra Uru Hu's writing, and they
    //   are his. Until today this file shipped his gate-name list and
    //   channel-name list more or less verbatim ("The Creative", "The
    //   Money Line", "Perfected Form", "Wait to respond") — a real
    //   exposure sitting in a public repo, and, in the strategies,
    //   also a breach of the creed: "Wait to respond" is a command.
    //
    // So every descriptive string below is written for this project,
    // in this project's register: what people who carry a
    // configuration REPORT, never what will happen or what to do.
    // Gates are anchored to their I Ching hexagram — the Chinese
    // title and pinyin come from the Zhouyi grammar in the sibling
    // recursive-iching repo, whose English reference is James Legge's
    // 1882 translation (public domain) — so the reader can always get
    // back to a source older and freer than any of us.
    //
    // The one editorial provenance note the reader sees is in the
    // markup, under the Human Design tab row. Keep it there; don't
    // multiply it.
    // ------------------------------------------------------------

    // Centers and their gates (with chakra correspondence).
    // `function` = the short label under a centre's name.
    // `description` = one sentence, ours, in the reporting register.
    const HD_CENTERS = {
        head: { name: 'Head', gates: [61, 63, 64], isMotor: false, pos: { x: 200, y: 30 }, chakra: 'Crown', chakraColor: '#9f7aea',
            function: 'Pressure to know',
            description: 'A pressure centre: questions, inspiration and the itch of the unresolved. It supplies the pressure, not the answers.' },
        ajna: { name: 'Ajna', gates: [4, 11, 17, 24, 43, 47], isMotor: false, pos: { x: 200, y: 100 }, chakra: 'Third Eye', chakraColor: '#667eea',
            function: 'Making sense',
            description: 'Where impressions become concepts, opinions and provisional answers — thinking, which this system treats as a tool rather than a decider.' },
        throat: { name: 'Throat', gates: [8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62], isMotor: false, pos: { x: 200, y: 170 }, chakra: 'Throat', chakraColor: '#4fd1c5',
            function: 'Saying and doing',
            description: 'The place where inner material becomes speech or action, and so becomes visible to other people.' },
        g: { name: 'G Center', gates: [1, 2, 7, 10, 13, 15, 25, 46], isMotor: false, pos: { x: 200, y: 260 }, chakra: 'Higher Heart', chakraColor: '#68d391',
            function: 'Identity and direction',
            description: 'A sense of who one is and which way one is facing — read here as orientation, not as destination.' },
        heart: { name: 'Heart', gates: [21, 26, 40, 51], isMotor: true, pos: { x: 130, y: 250 }, chakra: 'Heart', chakraColor: '#48bb78',
            function: 'Will and worth',
            description: 'Willpower, bargains and the question of what one is worth — an intermittent motor, described as working in bursts rather than continuously.' },
        sacral: { name: 'Sacral', gates: [3, 5, 9, 14, 27, 29, 34, 42, 59], isMotor: true, pos: { x: 200, y: 350 }, chakra: 'Sacral', chakraColor: '#ed8936',
            function: 'Life force and response',
            description: 'Generative energy for work and for making — a motor whose signal, in this system, shows up as response rather than as initiative.' },
        spleen: { name: 'Spleen', gates: [18, 28, 32, 44, 48, 50, 57], isMotor: false, pos: { x: 130, y: 320 }, chakra: 'Splenic', chakraColor: '#f6ad55',
            function: 'Instinct in the present',
            description: 'Survival awareness in the present tense: intuition, health and a fear that speaks once and does not repeat itself.' },
        solar: { name: 'Solar Plexus', gates: [6, 22, 30, 36, 37, 49, 55], isMotor: true, pos: { x: 270, y: 320 }, chakra: 'Solar Plexus', chakraColor: '#ecc94b',
            function: 'Feeling over time',
            description: 'Emotional weather that moves in waves — a motor whose information, this system holds, only becomes legible across time.' },
        root: { name: 'Root', gates: [19, 38, 39, 41, 52, 53, 54, 58, 60], isMotor: true, pos: { x: 200, y: 440 }, chakra: 'Root', chakraColor: '#fc8181',
            function: 'Pressure to move',
            description: 'Adrenal pressure to get going, get through and get done — fuel and stress arriving in the same current.' }
    };

    // Build gate-to-center lookup
    const HD_GATE_TO_CENTER = {};
    Object.entries(HD_CENTERS).forEach(([id, c]) => c.gates.forEach(g => HD_GATE_TO_CENTER[g] = id));

    // 36 Channels. The PAIR is the identity — "21-45" is a fact about
    // the system's wiring and is what the linked-views bus joins on.
    // The name and the note are ours (see the note above); they are
    // written from the two gates and the two centres the channel
    // actually connects, so they can be checked against the structure.
    const HD_CHANNELS = {
        '1-8':   { name: 'Creative Contribution', centers: ['g', 'throat'], note: 'An expression that is unmistakably one’s own, finding a place where other people can use it.' },
        '2-14':  { name: 'Direction and Means', centers: ['g', 'sacral'], note: 'Working resource meeting a sense of which way to point it.' },
        '3-60':  { name: 'Mutation Under Limit', centers: ['sacral', 'root'], note: 'New starts pressing against the constraint that gives them a shape.' },
        '4-63':  { name: 'Doubt and Hypothesis', centers: ['ajna', 'head'], note: 'A question that keeps returning, met by answers offered as attempts.' },
        '5-15':  { name: 'Tempo', centers: ['sacral', 'g'], note: 'A personal rhythm held inside a very wide human range.' },
        '6-59':  { name: 'Reaching Across', centers: ['solar', 'sacral'], note: 'The barrier between two people, and what gets past it.' },
        '7-31':  { name: 'Guiding Voice', centers: ['g', 'throat'], note: 'A role others follow, spoken aloud — held, in this telling, only as long as it is wanted.' },
        '9-52':  { name: 'Sustained Focus', centers: ['sacral', 'root'], note: 'Stillness holding energy on one small thing long enough for it to count.' },
        '10-20': { name: 'Being, Said Now', centers: ['g', 'throat'], note: 'Self-behaviour arriving in the present tense, without rehearsal.' },
        '10-34': { name: 'Self-Powered', centers: ['g', 'sacral'], note: 'Raw available energy spent on the business of being oneself.' },
        '10-57': { name: 'Intuitive Conduct', centers: ['g', 'spleen'], note: 'Behaviour tuned by what is heard in the moment rather than reasoned out.' },
        '11-56': { name: 'Ideas Told as Story', centers: ['ajna', 'throat'], note: 'Ideas that travel as stimulation for others, not as instructions for oneself.' },
        '12-22': { name: 'Mood and Voice', centers: ['throat', 'solar'], note: 'Expression that waits on the emotional moment and falls flat when forced.' },
        '13-33': { name: 'Keeping the Record', centers: ['g', 'throat'], note: 'What is heard, held, and later retold as a story worth having.' },
        '16-48': { name: 'Depth into Skill', centers: ['throat', 'spleen'], note: 'Capacity rehearsed until it comes out as talent.' },
        '17-62': { name: 'Opinion with the Details', centers: ['ajna', 'throat'], note: 'A view offered together with the particulars it rests on.' },
        '18-58': { name: 'The Urge to Improve', centers: ['spleen', 'root'], note: 'Vitality aimed at what could be corrected — delight and criticism in one motion.' },
        '19-49': { name: 'Needs and Terms', centers: ['root', 'solar'], note: 'Sensitivity to need, met by the terms an arrangement is actually built on.' },
        '20-34': { name: 'Doing, Now', centers: ['throat', 'sacral'], note: 'Energy that shows up as activity in the present rather than as a plan.' },
        '20-57': { name: 'Hearing and Saying', centers: ['throat', 'spleen'], note: 'Instinct heard and voiced in the same moment, once.' },
        '21-45': { name: 'Stewardship', centers: ['heart', 'throat'], note: 'Control of material resources, spoken for on a group’s behalf — keeping rather than owning.' },
        '23-43': { name: 'Insight into Language', centers: ['throat', 'ajna'], note: 'Private knowing translated into a sentence someone else can take in.' },
        '24-61': { name: 'The Returning Question', centers: ['ajna', 'head'], note: 'Pressure toward the unknowable, revisited until it finally yields something.' },
        '25-51': { name: 'Shock and Innocence', centers: ['g', 'heart'], note: 'A jolt that tests whether an uncalculating regard for life survives it.' },
        '26-44': { name: 'Instinct and the Pitch', centers: ['heart', 'spleen'], note: 'A read on people put to work in making a case.' },
        '27-50': { name: 'Care and Values', centers: ['sacral', 'spleen'], note: 'Looking after others inside a set of values somebody has to keep.' },
        '28-38': { name: 'The Struggle for Meaning', centers: ['spleen', 'root'], note: 'A fight taken on, and the open question of whether it was worth having.' },
        '29-46': { name: 'Turning Up', centers: ['sacral', 'g'], note: 'Saying yes and being physically present — commitment plus embodiment.' },
        '30-41': { name: 'Desire Beginning', centers: ['solar', 'root'], note: 'Fantasy compressing into wanting, ahead of any experience of it.' },
        '32-54': { name: 'Ambition and Endurance', centers: ['spleen', 'root'], note: 'Drive to rise, checked by an instinct for what will actually last.' },
        '34-57': { name: 'Power on Instinct', centers: ['sacral', 'spleen'], note: 'Force released by what is heard in the moment.' },
        '35-36': { name: 'Appetite and Crisis', centers: ['throat', 'solar'], note: 'Hunger for new experience, and the dip that tends to sit inside it.' },
        '37-40': { name: 'The Agreement', centers: ['solar', 'heart'], note: 'Warmth and work held together by terms said out loud rather than assumed.' },
        '39-55': { name: 'Provocation and Mood', centers: ['root', 'solar'], note: 'Pressure applied to feeling, to find out what is really there.' },
        '42-53': { name: 'Cycles', centers: ['sacral', 'root'], note: 'Pressure to begin, met by the energy to see a thing to its end.' },
        '47-64': { name: 'Sense from Confusion', centers: ['ajna', 'head'], note: 'Unsorted images working, slowly, toward something that means anything.' }
    };

    // The 64 gates.
    //
    //   `hex` / `pinyin` — the King Wen hexagram this gate corresponds
    //     to, as titled in the Zhouyi. Structure and public record;
    //     transcribed from the sibling recursive-iching repo
    //     (grammars/zhouyi), whose English reference is Legge 1882.
    //   `name` / `theme` / `text` — ours. Written from the hexagram
    //     and from the centre the gate sits in, in the reporting
    //     register: what the tradition reads there, not what will
    //     happen to the reader.
    //
    // `text` is one sentence on purpose: it has to fit the gate card
    // at 375px without a scrollbar.
    const HD_GATE_MEANINGS = {
        1:  { name: 'Origination', theme: 'Expression from the inside out', hex: '乾', pinyin: 'qián',
              text: '乾 is unbroken initiating force. Read here as the impulse to make something unmistakably one’s own, whether or not anyone asked for it.' },
        2:  { name: 'Orientation', theme: 'A direction received rather than forced', hex: '坤', pinyin: 'kūn',
              text: '坤 is the yielding ground that carries everything. Read here as a sense of which way to face that seems to arrive rather than be decided.' },
        3:  { name: 'First Sprouting', theme: 'New form struggling into order', hex: '屯', pinyin: 'zhūn',
              text: '屯 is the seed pushing through hard ground. Read here as the awkward, generative work of starting something before it has a shape.' },
        4:  { name: 'Provisional Answers', theme: 'Formulas offered before certainty', hex: '蒙', pinyin: 'méng',
              text: '蒙 is the unlit mind looking for a teacher. Read here as a habit of producing possible answers, which are attempts rather than proofs.' },
        5:  { name: 'Rhythm', theme: 'The body’s own timing', hex: '需', pinyin: 'xū',
              text: '需 is waiting with confidence for what is already on its way. Read here as attachment to a personal tempo, and friction when it is interrupted.' },
        6:  { name: 'Friction', theme: 'The edge where closeness is negotiated', hex: '讼', pinyin: 'sòng',
              text: '讼 is dispute. Read here as the charged boundary between people — the place where conflict and intimacy turn out to be the same doorway.' },
        7:  { name: 'The Role Taken', theme: 'Serving a direction others follow', hex: '师', pinyin: 'shī',
              text: '师 is the disciplined host under one leader. Read here as a taste for the guiding role, framed by the tradition as influence given rather than seized.' },
        8:  { name: 'Contribution', theme: 'Making a shared thing visible', hex: '比', pinyin: 'bǐ',
              text: '比 is holding together around a common centre. Read here as putting one’s own contribution in service of something others already care about.' },
        9:  { name: 'Narrow Focus', theme: 'Energy gathered on the small thing', hex: '小畜', pinyin: 'xiǎochù',
              text: '小畜 is the taming of small forces. Read here as the capacity to keep energy on one detail long enough for it to matter.' },
        10: { name: 'Conduct', theme: 'How one walks, in one’s own way', hex: '履', pinyin: 'lǚ',
              text: '履 is treading carefully, even on the tiger’s tail. Read here as self-regard expressed as behaviour — the insistence on being oneself in company.' },
        11: { name: 'Ideas in Passage', theme: 'Ideas that are for sharing, not keeping', hex: '泰', pinyin: 'tài',
              text: '泰 is the fertile exchange between above and below. Read here as a mind full of ideas that work as stimulus for others rather than instructions for oneself.' },
        12: { name: 'Caution', theme: 'Speech held until the mood is right', hex: '否', pinyin: 'pǐ',
              text: '否 is standstill, when exchange is blocked. Read here as expression that arrives only in its own moment and falls flat when forced.' },
        13: { name: 'The Confidant', theme: 'Holding what other people tell you', hex: '同人', pinyin: 'tóngrén',
              text: '同人 is fellowship in the open. Read here as the role of the one people tell things to, and the weight of holding a shared past.' },
        14: { name: 'Means', theme: 'Resource pointed at what one loves', hex: '大有', pinyin: 'dàyǒu',
              text: '大有 is great holding. Read here as working power — a capacity to generate means, and the standing question of what they are aimed at.' },
        15: { name: 'Range', theme: 'Extremes, and the mean between them', hex: '谦', pinyin: 'qiān',
              text: '谦 is the modesty that levels high and low. Read here as a wide, irregular rhythm that can read as inconsistency from outside and as humanity from inside.' },
        16: { name: 'Enthusiasm', theme: 'Talent kindled by real interest', hex: '豫', pinyin: 'yù',
              text: '豫 is the enthusiasm that gathers others. Read here as skill that shows up when the interest is genuine, and the rehearsal that tends to precede it.' },
        17: { name: 'Opinion', theme: 'A view offered, not imposed', hex: '随', pinyin: 'suí',
              text: '随 is following what is worth following. Read here as the ready opinion — a pattern noticed and offered, best taken as one view among several.' },
        18: { name: 'Correction', theme: 'Seeing what has gone wrong', hex: '蛊', pinyin: 'gǔ',
              text: '蛊 is repairing what decay has spoiled. Read here as an eye for the flaw in an inherited pattern, and the delicate question of when to say so.' },
        19: { name: 'Approach', theme: 'Attunement to what is needed', hex: '临', pinyin: 'lín',
              text: '临 is drawing near. Read here as sensitivity to need — one’s own and other people’s — and the pressure that comes with closing the distance.' },
        20: { name: 'The Present', theme: 'Awareness spoken in the moment', hex: '观', pinyin: 'guān',
              text: '观 is contemplation from a height. Read here as perception that exists only in the present tense, and speech that arrives with it.' },
        21: { name: 'Control of Means', theme: 'Will over one’s own territory', hex: '噬嗑', pinyin: 'shìkè',
              text: '噬嗑 is biting through an obstruction. Read here as the will to govern one’s own resources — authority in a domain, the tradition says, not over people.' },
        22: { name: 'Grace', theme: 'Openness with a mood behind it', hex: '贲', pinyin: 'bì',
              text: '贲 is beauty as form. Read here as social openness running on feeling: abundant in one mood, simply unavailable in another.' },
        23: { name: 'Making It Plain', theme: 'Turning insight into a sentence', hex: '剥', pinyin: 'bō',
              text: '剥 is stripping away. Read here as the work of reducing a private insight to language other people can actually take in.' },
        24: { name: 'Return', theme: 'The thought that keeps coming back', hex: '复', pinyin: 'fù',
              text: '复 is the turning point where what left comes back. Read here as a mind that revisits the same question until it finally yields.' },
        25: { name: 'Innocence', theme: 'Regard that is not earned', hex: '无妄', pinyin: 'wúwàng',
              text: '无妄 is innocence without calculation. Read here as a love of life aimed at no one in particular, which can read as warmth and as indifference.' },
        26: { name: 'The Persuader', theme: 'Memory and will in service of a case', hex: '大畜', pinyin: 'dàchù',
              text: '大畜 is the great accumulation held in reserve. Read here as the will to make a case — persuasion that works best when what it sells is true.' },
        27: { name: 'Care', theme: 'Feeding what cannot yet feed itself', hex: '颐', pinyin: 'yí',
              text: '颐 is nourishment, and what one takes in. Read here as the impulse to look after others, with the open question of where that care is best spent.' },
        28: { name: 'The Stake', theme: 'Risk taken for a reason worth it', hex: '大过', pinyin: 'dàguò',
              text: '大过 is the beam bending under too much weight. Read here as a willingness to gamble, and the long search for something worth the gamble.' },
        29: { name: 'Commitment', theme: 'Saying yes, and staying in', hex: '习坎', pinyin: 'kǎn',
              text: '坎 is the repeated chasm, crossed by staying true. Read here as the capacity to commit and see a thing through — including things not worth committing to.' },
        30: { name: 'Longing', theme: 'Desire that burns and passes', hex: '离', pinyin: 'lí',
              text: '离 is fire that clings to its fuel. Read here as the intensity of wanting: a heat that illuminates and does not last.' },
        31: { name: 'Voice That Leads', theme: 'Influence that depends on being wanted', hex: '咸', pinyin: 'xián',
              text: '咸 is mutual influence. Read here as leadership that lives in speech and holds, the tradition says, only as long as others actually want it.' },
        32: { name: 'Endurance', theme: 'Instinct for what will last', hex: '恒', pinyin: 'héng',
              text: '恒 is duration. Read here as an instinct for which things have staying power, often reported alongside a fear of their failing.' },
        33: { name: 'Retreat', theme: 'Withdrawal that turns events into story', hex: '遁', pinyin: 'dùn',
              text: '遁 is timely retreat. Read here as the need to step back, and the memory-keeping that turns what happened into something tellable.' },
        34: { name: 'Raw Power', theme: 'Energy that means nothing until spent', hex: '大壮', pinyin: 'dàzhuàng',
              text: '大壮 is great strength. Read here as sheer available force — busy, self-absorbed, and most itself when it is doing something.' },
        35: { name: 'Appetite for Change', theme: 'Progress measured in new experience', hex: '晋', pinyin: 'jìn',
              text: '晋 is advance like the rising sun. Read here as hunger for the next experience, and the restlessness of having already done this one.' },
        36: { name: 'Passage Through Darkness', theme: 'Crisis as the price of the new', hex: '明夷', pinyin: 'míngyí',
              text: '明夷 is the light going under. Read here as turbulence around untried experience — the dip that the tradition says tends to precede competence.' },
        37: { name: 'The Bargain', theme: 'Warmth held by agreement', hex: '家人', pinyin: 'jiārén',
              text: '家人 is the household with its roles. Read here as the warmth of belonging, tied by the tradition to explicit agreements rather than assumed ones.' },
        38: { name: 'The Fight', theme: 'Resistance in service of something', hex: '睽', pinyin: 'kuí',
              text: '睽 is opposition between things that will not merge. Read here as the drive to push against, most useful when what is being fought for is clear.' },
        39: { name: 'Provocation', theme: 'Pressure applied to see what is there', hex: '蹇', pinyin: 'jiǎn',
              text: '蹇 is obstruction that turns one back on oneself. Read here as a knack for poking at things and people to find out what emerges.' },
        40: { name: 'Release', theme: 'Withdrawal after the work', hex: '解', pinyin: 'xiè',
              text: '解 is release after tension. Read here as the solitude that follows effort, and the bargain between work given and rest taken.' },
        41: { name: 'The Start of Feeling', theme: 'Fantasy pressing toward experience', hex: '损', pinyin: 'sǔn',
              text: '损 is the decrease that concentrates. Read here as the compressed beginning of desire — imagination running well ahead of anything that has happened.' },
        42: { name: 'Completion', theme: 'Seeing cycles through to the end', hex: '益', pinyin: 'yì',
              text: '益 is increase. Read here as energy for finishing what was begun, and impatience with things left half-done.' },
        43: { name: 'Breakthrough', theme: 'Knowing before you can explain it', hex: '夬', pinyin: 'guài',
              text: '夬 is resolute breakthrough. Read here as inner knowing that arrives complete and needs translating before anyone else can use it.' },
        44: { name: 'Recognition', theme: 'Instinct about people and their past', hex: '姤', pinyin: 'gòu',
              text: '姤 is an unexpected meeting. Read here as an instinctive read on people — a hypothesis about a pattern, not a verdict on a person.' },
        45: { name: 'The Gathering', theme: 'Speaking for what a group holds', hex: '萃', pinyin: 'cuì',
              text: '萃 is gathering together. Read here as the voice that speaks for what a group has in common — stewardship rather than ownership.' },
        46: { name: 'Embodiment', theme: 'Being in the body, in the right place', hex: '升', pinyin: 'shēng',
              text: '升 is steady ascent. Read here as a love of being embodied, and the luck of turning up where something happens to be happening.' },
        47: { name: 'Making Sense of It', theme: 'Confusion resolving late into meaning', hex: '困', pinyin: 'kùn',
              text: '困 is being hemmed in. Read here as mental pressure to make sense of the past, where the answer often arrives long after the question.' },
        48: { name: 'The Well', theme: 'Depth that waits for its moment', hex: '井', pinyin: 'jǐng',
              text: '井 is the well that must be drawn from to be any use. Read here as depth of capacity, often reported with a fear of not being adequate to it.' },
        49: { name: 'Principles', theme: 'The line that, crossed, ends the arrangement', hex: '革', pinyin: 'gé',
              text: '革 is revolution, when the old arrangement no longer holds. Read here as sensitivity to principle — the point past which a bond is renegotiated or ends.' },
        50: { name: 'Values Held', theme: 'The rules a group lives by', hex: '鼎', pinyin: 'dǐng',
              text: '鼎 is the ritual vessel that holds what nourishes. Read here as an instinct for the values a group keeps, and a sense of responsibility for them.' },
        51: { name: 'Shock', theme: 'The jolt that starts something', hex: '震', pinyin: 'zhèn',
              text: '震 is thunder that startles and then passes. Read here as competitive drive, and the shock that can knock a person into a different life.' },
        52: { name: 'Stillness', theme: 'Pressure to sit still and concentrate', hex: '艮', pinyin: 'gèn',
              text: '艮 is the mountain, keeping still. Read here as pressure to stop moving — stillness that concentrates, or that stalls.' },
        53: { name: 'Beginnings', theme: 'Pressure to start the next thing', hex: '渐', pinyin: 'jiàn',
              text: '渐 is gradual development. Read here as pressure to begin, abundant at the start of a cycle and no guarantee of finishing it.' },
        54: { name: 'Ambition', theme: 'Drive to rise through connection', hex: '归妹', pinyin: 'guīmèi',
              text: '归妹 is entering by the side door. Read here as ambition — the drive to move up, and the alliances that tend to come with it.' },
        55: { name: 'Abundance', theme: 'Mood swinging wide, on its own schedule', hex: '丰', pinyin: 'fēng',
              text: '丰 is fullness at its peak, already turning. Read here as the wave of mood — which this system treats as information, not as a verdict.' },
        56: { name: 'The Storyteller', theme: 'Experience turned into a telling', hex: '旅', pinyin: 'lǚ',
              text: '旅 is the traveller passing through. Read here as a taste for stimulation and for the telling of it, with story as the currency.' },
        57: { name: 'Clarity in the Ear', theme: 'Intuition arriving as sound', hex: '巽', pinyin: 'xùn',
              text: '巽 is wind that penetrates by persistence. Read here as intuition heard rather than reasoned — a signal in the present that does not repeat itself.' },
        58: { name: 'Aliveness', theme: 'Joy pressing toward improvement', hex: '兑', pinyin: 'duì',
              text: '兑 is joy that gathers. Read here as vitality with an edge: delight in what is, and in what could be made better.' },
        59: { name: 'Breaking Through Reserve', theme: 'Getting past the barrier between two people', hex: '涣', pinyin: 'huàn',
              text: '涣 is dissolving what has hardened. Read here as the capacity to get past another person’s reserve — intimacy as something made, not assumed.' },
        60: { name: 'Limits', theme: 'The constraint that makes the new possible', hex: '节', pinyin: 'jié',
              text: '节 is limitation, the joint in the bamboo. Read here as the tension between accepting a constraint and mutating past it.' },
        61: { name: 'Inner Truth', theme: 'Pressure to know what cannot be known', hex: '中孚', pinyin: 'zhōngfú',
              text: '中孚 is truth at the centre. Read here as mental pressure toward the unknowable: inspiration when it lands, rumination when it does not.' },
        62: { name: 'Details', theme: 'Naming the small parts precisely', hex: '小过', pinyin: 'xiǎoguò',
              text: '小过 is the small exceeding. Read here as care for detail and for the naming of things — the machinery that makes an idea communicable.' },
        63: { name: 'Doubt', theme: 'Questioning what looks finished', hex: '既济', pinyin: 'jìjì',
              text: '既济 is completion already tipping toward disorder. Read here as doubt used as a method: pressure to ask whether the pattern really holds.' },
        64: { name: 'Before It Resolves', theme: 'Images that have not yet made sense', hex: '未济', pinyin: 'wèijì',
              text: '未济 is the crossing not yet finished. Read here as a head full of unsorted images, pressure without conclusion, and the eventual click.' }
    };

    // Longitude → gate + line, straight from the wheel geometry: how far
    // past the start of gate 17 the point sits, in 5.625° steps. Same
    // formula the open-source implementations use — no table walk, so no
    // boundary can be off by a rounding.
    function getHDGateFromLongitude(longitude) {
        const fromWheelStart = (((longitude - HD_WHEEL_START) % 360) + 360) % 360;
        const index = Math.floor(fromWheelStart / HD_GATE_ARC);
        const intoGate = fromWheelStart - index * HD_GATE_ARC;
        const line = Math.min(Math.floor(intoGate / HD_LINE_ARC) + 1, 6);
        return { gate: HD_GATE_ORDER[index % 64], line };
    }

    // ------------------------------------------------------------
    // The ACTIVATION layer, in one place (Aug 6 2026).
    //
    // Both drawings and both list views ask the same question of a
    // gate — which side of the chart switched it on — and each used
    // to answer it with its own inline ternary and its own colours.
    // One function, one vocabulary: 'design' | 'personality' |
    // 'both' | 'none'. It goes onto every gate element as data-act,
    // which is what the selection CSS reads to know how far a thing
    // is allowed to recede.
    // ------------------------------------------------------------
    const HD_ACT_WORDS = {
        both: ' — Design and Personality',
        design: ' — Design',
        personality: ' — Personality',
        none: ''
    };

    // ------------------------------------------------------------
    // The ACTIVATION set, normalised (6 Sep 2026).
    //
    // The shape the viewer already builds goes straight in — pass it
    // hdChart:
    //   { activatedGates: Map<gate, {personality, design, planets}>,
    //     definedChannels: [{ id, ... }], definedCenters: Set<centreId> }
    // and so does anything looser: an array of gate numbers, a plain
    // object keyed by gate, arrays instead of Sets, or channels and
    // centres left out entirely — in which case they are DERIVED by the
    // same rule the chart uses (a channel is defined when both its gates
    // are lit, a centre when a defined channel touches it). One place
    // decides what "lit" and "defined" mean, so a caller holding a whole
    // chart and a caller holding one gate number cannot disagree about
    // the drawing.
    // ------------------------------------------------------------
    function normalize(activations) {
        const a = activations || {};
        const gates = new Map();
        const rawGates = a.gates !== undefined ? a.gates : a.activatedGates;

        const put = (g, v) => {
            const n = Number(g);
            if (!(n >= 1 && n <= 64)) return;
            gates.set(n, {
                personality: !!(v && v.personality),
                design: !!(v && v.design),
                planets: (v && v.planets) || []
            });
        };
        // A bare gate number carries no side, and a gate has to be lit by
        // something: read it as Personality, which is the accent hue.
        if (rawGates instanceof Map) rawGates.forEach((v, g) => put(g, v));
        else if (rawGates instanceof Set) rawGates.forEach(g => put(g, { personality: true }));
        else if (Array.isArray(rawGates)) rawGates.forEach(g => {
            if (g && typeof g === 'object') put(g.gate, g); else put(g, { personality: true });
        });
        else if (rawGates && typeof rawGates === 'object') {
            Object.keys(rawGates).forEach(g => put(g, rawGates[g]));
        }

        const asSet = v => {
            if (v instanceof Set) return new Set(v);
            if (Array.isArray(v)) return new Set(v.map(x => (x && typeof x === 'object' ? x.id : x)));
            return null;
        };
        let channels = asSet(a.channels !== undefined ? a.channels : a.definedChannels);
        let centers = asSet(a.centers !== undefined ? a.centers : a.definedCenters);

        if (!channels) {
            channels = new Set();
            Object.keys(HD_CHANNELS).forEach(id => {
                const pair = id.split('-').map(Number);
                if (gates.has(pair[0]) && gates.has(pair[1])) channels.add(id);
            });
        }
        if (!centers) {
            centers = new Set();
            channels.forEach(id => {
                if (HD_CHANNELS[id]) HD_CHANNELS[id].centers.forEach(c => centers.add(c));
            });
        }
        return { gates: gates, channels: channels, centers: centers };
    }

    // Which side of the chart switched a gate on. Was hdGateActivation() in
    // the viewer, reading module scope; the set arrives as an argument now.
    function gateActivation(A, g) {
        const a = A.gates.get(Number(g));
        if (!a) return 'none';
        if (a.personality && a.design) return 'both';
        if (a.design) return 'design';
        return 'personality';
    }

    // ------------------------------------------------------------
    // Presentation choices — the ones the inline renderers used to read
    // off globals. Every default is the viewer's old behaviour, so
    // renderBodygraph(hdChart) with no opts draws exactly what the
    // viewer drew before this file existed.
    //
    //   interactive   emit the onclick handlers and cursor:pointer that
    //                 the viewer's selection bus needs. An exported .svg
    //                 has nothing to call, so it passes false.
    //   legend        the bodygraph's legend strip. Off also shortens the
    //                 viewBox to the board itself: the 54 units below
    //                 y=638 exist only to hold the legend.
    //   legendMode    'activation' colours each lit gate by the side that
    //                 lit it; 'center' drops that hue so what stands out
    //                 is which centres are lit. The viewer's two pills.
    //   zodiacMode    the mandala's ring. 'sidereal' turns the zodiac back
    //   ayanamsaDegrees   by the ayanamsa the CALLER supplies — this module
    //                 does not know what moment it is drawing.
    //   size          the mandala's square side (520 in the viewer panel).
    //   viewBox       { w, h } override for the bodygraph board.
    //   planets       [{ key, lon, symbol, type: 'design'|'personality' }],
    //                 mandala only. Null draws a bare wheel.
    //   embedStyle    write the --bgc-* palette into the SVG (see PALETTE).
    //   theme         with embedStyle: 'auto' (light + prefers-color-scheme
    //                 dark), or 'light' / 'dark' to pin one.
    // ------------------------------------------------------------
    const DEFAULTS = {
        interactive: true,
        legend: true,
        legendMode: 'activation',
        zodiacMode: 'tropical',
        ayanamsaDegrees: 0,
        size: 520,
        viewBox: null,
        planets: null,
        embedStyle: false,
        theme: 'auto'
    };

    function mergeOpts(opts) {
        const o = {};
        Object.keys(DEFAULTS).forEach(k => { o[k] = DEFAULTS[k]; });
        if (opts) Object.keys(opts).forEach(k => { if (opts[k] !== undefined) o[k] = opts[k]; });
        o.viewBox = o.viewBox || { w: 400, h: o.legend ? 692 : 638 };
        return o;
    }

    // The tap handlers, in one place. They name functions that live in the
    // viewer, not here — which is exactly why they are optional.
    const tapGate = (o, g, source) => (o.interactive
        ? 'style="cursor:pointer" onclick="selectHDGate(' + g + ", '" + source + '\')"' : '');
    const tapChannel = (o, id) => (o.interactive
        ? 'style="cursor:pointer" onclick="selectHDChannel(\'' + id + '\', \'bodygraph\')"' : '');
    const tapCenter = (o, id) => (o.interactive
        ? 'style="cursor:pointer" onclick="selectHDCenter(\'' + id + '\', \'bodygraph\')"' : '');
    const tapClear = (o) => (o.interactive
        ? 'onclick="setChartSelection(null, \'bodygraph\')"' : '');

    // ------------------------------------------------------------
    // The palette, as something this module can hand out.
    //
    // The same values astrology-viewer.html defines at the foot of its
    // stylesheet. They are written here for the callers that have no
    // stylesheet: a .svg file opened on its own has to carry its own
    // colours. Light is the default there and dark follows the reader's
    // system setting, which is the way round a file on disk wants.
    // ------------------------------------------------------------
    const PALETTE = {
        dark: {
            '--bgc-accent': '#a99bf5', '--bgc-accent-soft': '#2b2748', '--bgc-dim': '#3a3947',
            '--bgc-surface': '#1a1922', '--bgc-line': '#2a2933', '--bgc-mut': '#8f8aa0',
            '--bgc-gate-on-text': '#141225', '--bgc-design': '#e8615f', '--bgc-both': '#e0b84c',
            '--bgc-gate-on-text-warm': '#241a05', '--bgc-ink-dim': '#cfc9dd',
            '--bgc-plate': '#141320', '--astro-gold': '#6f9fd8'
        },
        light: {
            '--bgc-accent': '#6d5bd0', '--bgc-accent-soft': '#e7e2fa', '--bgc-dim': '#d5cfc4',
            '--bgc-surface': '#fffdf9', '--bgc-line': '#e7e1d6', '--bgc-mut': '#8a8496',
            '--bgc-gate-on-text': '#ffffff', '--bgc-design': '#c62f2d', '--bgc-both': '#a9791a',
            '--bgc-gate-on-text-warm': '#ffffff', '--bgc-ink-dim': '#4a4458',
            '--bgc-plate': '#faf7f0', '--astro-gold': '#2f5d8a'
        }
    };

    const asVars = t => Object.keys(PALETTE[t]).map(k => k + ':' + PALETTE[t][k]).join(';');

    function paletteCSS(theme) {
        if (theme === 'dark') return ':root{' + asVars('dark') + '}';
        if (theme === 'light') return ':root{' + asVars('light') + '}';
        return ':root{' + asVars('light') + '}'
            + '@media (prefers-color-scheme: dark){:root{' + asVars('dark') + '}}';
    }

    // The legend's second row explains the SELECTION layer and is hidden in
    // CSS off .hd-focus — a rule the viewer's stylesheet carries. A file that
    // leaves this page carries no selection layer at all, so it carries the
    // rule instead: without it an exported drawing shows a legend for a
    // highlight nothing can apply.
    const EXPORT_CSS = '.hd-legend-sel{display:none}';

    function styleTag(o) {
        return o.embedStyle
            ? '<style>' + paletteCSS(o.theme) + EXPORT_CSS + '</style>' : '';
    }

    // ============================================================
    // THE MANDALA — the wheel of 64 gates against the zodiac, with the
    // chart's planets inside it. Was renderHDMandala() in the viewer.
    // ============================================================
    function renderMandala(activations, opts) {
        const A = normalize(activations);
        const o = mergeOpts(opts);

        const size = o.size, cx = size/2, cy = size/2;
        const outerR = 210, innerR = 150, gateR = 180;
        const planetR = 110; // INSIDE the wheel (slightly smaller)
        const zodiacR = 230; // Outside for zodiac signs
        const innerZodiacR = 138; // Inner zodiac ring radius
        const innerZodiacInnerR = 125; // Inner edge of inner zodiac ring

        // Zodiac offset based on mode — the real ayanamsa for this chart's
        // moment and selected school, not a constant.
        const zodiacOffset = o.zodiacMode === 'sidereal' ? -o.ayanamsaDegrees : 0;

        // Zodiac signs and their starting degrees
        const ZODIAC_SIGNS = [
            { symbol: '♈', name: 'Aries', start: 0 },
            { symbol: '♉', name: 'Taurus', start: 30 },
            { symbol: '♊', name: 'Gemini', start: 60 },
            { symbol: '♋', name: 'Cancer', start: 90 },
            { symbol: '♌', name: 'Leo', start: 120 },
            { symbol: '♍', name: 'Virgo', start: 150 },
            { symbol: '♎', name: 'Libra', start: 180 },
            { symbol: '♏', name: 'Scorpio', start: 210 },
            { symbol: '♐', name: 'Sagittarius', start: 240 },
            { symbol: '♑', name: 'Capricorn', start: 270 },
            { symbol: '♒', name: 'Aquarius', start: 300 },
            { symbol: '♓', name: 'Pisces', start: 330 }
        ];

        let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">` + styleTag(o);

        // Background. Was a flat rgba(10,10,20,0.3), i.e. a dark hole on
        // the light plate that turned the whole gate ring into grey mush.
        svg += `<circle cx="${cx}" cy="${cy}" r="${outerR + 25}" fill="var(--bgc-plate)"/>`;

        // Zodiac sign segments (outer ring)
        ZODIAC_SIGNS.forEach((sign, i) => {
            const startDeg = sign.start + zodiacOffset;
            const startAngle = (startDeg - 90) * Math.PI / 180;
            const endAngle = (startDeg + 30 - 90) * Math.PI / 180;
            const midAngle = (startDeg + 15 - 90) * Math.PI / 180;

            // Zodiac segment arc
            const x1 = cx + outerR * Math.cos(startAngle);
            const y1 = cy + outerR * Math.sin(startAngle);
            const x2 = cx + (outerR + 20) * Math.cos(startAngle);
            const y2 = cy + (outerR + 20) * Math.sin(startAngle);
            const x3 = cx + (outerR + 20) * Math.cos(endAngle);
            const y3 = cy + (outerR + 20) * Math.sin(endAngle);
            const x4 = cx + outerR * Math.cos(endAngle);
            const y4 = cy + outerR * Math.sin(endAngle);

            const colors = ['#ef4444', '#22c55e', '#eab308', '#3b82f6'];
            const fillColor = colors[i % 4];
            svg += `<path d="M${x1},${y1} L${x2},${y2} A${outerR+20},${outerR+20} 0 0 1 ${x3},${y3} L${x4},${y4} A${outerR},${outerR} 0 0 0 ${x1},${y1}" fill="${fillColor}22" stroke="${fillColor}44" stroke-width="0.5"/>`;

            // Zodiac symbol
            const tx = cx + zodiacR * Math.cos(midAngle);
            const ty = cy + zodiacR * Math.sin(midAngle);
            svg += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="${fillColor}" font-size="14" opacity="0.8">${sign.symbol}</text>`;
        });

        // Gate ring circles
        svg += `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="var(--bgc-dim)" stroke-width="1"/>`;
        svg += `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="var(--bgc-dim)" stroke-width="1"/>`;

        // Gate segments
        HD_GATE_SEQUENCE.forEach((gate, i) => {
            const startAngle = (gate.start - 90) * Math.PI / 180;
            // Was a literal 5.625 / 2.8125 pair. Same number, but the
            // gate arc has a name three hundred lines up and nothing
            // in this file should be able to disagree with it.
            const endAngle = startAngle + (HD_GATE_ARC * Math.PI / 180);
            const isActivated = A.gates.has(gate.gate);

            // ACTIVATION layer, in the same three hues and the same tokens
            // the bodygraph uses. Until Aug 6 2026 the mandala mixed its own
            // literal rgba() — a different red, a different gold, a different
            // purple — and baked the transparency into the colour, so when the
            // selection layer put its opacity on top the two multiplied and a
            // 0.4 fill became 0.06. Hue and strength are separate properties
            // now: fill-opacity carries the wash, opacity is left free for
            // the selection layer alone.
            const act = gateActivation(A, gate.gate);
            let fill = 'var(--bgc-surface)', fillOp = 1;
            if (isActivated) {
                fill = act === 'both' ? 'var(--bgc-both)'
                     : act === 'design' ? 'var(--bgc-design)' : 'var(--bgc-accent)';
                fillOp = 0.62;
            }

            const x1 = cx + innerR * Math.cos(startAngle), y1 = cy + innerR * Math.sin(startAngle);
            const x2 = cx + outerR * Math.cos(startAngle), y2 = cy + outerR * Math.sin(startAngle);
            const x3 = cx + outerR * Math.cos(endAngle), y3 = cy + outerR * Math.sin(endAngle);
            const x4 = cx + innerR * Math.cos(endAngle), y4 = cy + innerR * Math.sin(endAngle);

            svg += `<path class="hd-gate" data-hd-gate="${gate.gate}" data-act="${act}" d="M${x1},${y1} L${x2},${y2} A${outerR},${outerR} 0 0 1 ${x3},${y3} L${x4},${y4} A${innerR},${innerR} 0 0 0 ${x1},${y1}" fill="${fill}" fill-opacity="${fillOp}" stroke="var(--bgc-line)" stroke-width="0.5" ${tapGate(o, gate.gate, 'mandala')}><title>Gate ${gate.gate}${isActivated ? HD_ACT_WORDS[act] : ' — not activated'}</title></path>`;

            const midAngle = startAngle + (HD_GATE_ARC / 2 * Math.PI / 180);
            const tx = cx + gateR * Math.cos(midAngle), ty = cy + gateR * Math.sin(midAngle);
            // #555 on this plate was below the floor of legibility for the
            // 40-odd gates a chart does not activate — they are the context
            // the activated ones are read against, so they have to be visible.
            // The activated numeral sits on a 0.62 wash, so it takes the same
            // ink the bodygraph's discs take rather than a hard-coded white.
            svg += `<text class="hd-gate" data-hd-gate="${gate.gate}" data-act="${act}" x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="${isActivated ? (act === 'design' ? '#ffffff' : (act === 'both' ? 'var(--bgc-gate-on-text-warm)' : 'var(--bgc-gate-on-text)')) : 'var(--bgc-mut)'}" font-size="9" font-weight="${isActivated ? 'bold' : 'normal'}" ${tapGate(o, gate.gate, 'mandala')}>${gate.gate}</text>`;
        });

        // Inner zodiac ring (inside the gate wheel)
        svg += `<circle cx="${cx}" cy="${cy}" r="${innerZodiacR}" fill="none" stroke="rgba(100,100,120,0.3)" stroke-width="0.5"/>`;
        svg += `<circle cx="${cx}" cy="${cy}" r="${innerZodiacInnerR}" fill="none" stroke="rgba(100,100,120,0.3)" stroke-width="0.5"/>`;

        ZODIAC_SIGNS.forEach((sign, i) => {
            const startDeg = sign.start + zodiacOffset;
            const startAngle = (startDeg - 90) * Math.PI / 180;
            const endAngle = (startDeg + 30 - 90) * Math.PI / 180;
            const midAngle = (startDeg + 15 - 90) * Math.PI / 180;

            // Inner zodiac segment
            const iz1 = cx + innerZodiacInnerR * Math.cos(startAngle);
            const iz2 = cy + innerZodiacInnerR * Math.sin(startAngle);
            const iz3 = cx + innerZodiacR * Math.cos(startAngle);
            const iz4 = cy + innerZodiacR * Math.sin(startAngle);
            const iz5 = cx + innerZodiacR * Math.cos(endAngle);
            const iz6 = cy + innerZodiacR * Math.sin(endAngle);
            const iz7 = cx + innerZodiacInnerR * Math.cos(endAngle);
            const iz8 = cy + innerZodiacInnerR * Math.sin(endAngle);

            const colors = ['#ef4444', '#22c55e', '#eab308', '#3b82f6'];
            const fillColor = colors[i % 4];
            svg += `<path d="M${iz1},${iz2} L${iz3},${iz4} A${innerZodiacR},${innerZodiacR} 0 0 1 ${iz5},${iz6} L${iz7},${iz8} A${innerZodiacInnerR},${innerZodiacInnerR} 0 0 0 ${iz1},${iz2}" fill="${fillColor}15" stroke="${fillColor}33" stroke-width="0.5"/>`;

            // Inner zodiac symbol (smaller)
            const symbolR = (innerZodiacR + innerZodiacInnerR) / 2;
            const sx = cx + symbolR * Math.cos(midAngle);
            const sy = cy + symbolR * Math.sin(midAngle);
            svg += `<text x="${sx}" y="${sy}" text-anchor="middle" dominant-baseline="middle" fill="${fillColor}" font-size="9" opacity="0.6">${sign.symbol}</text>`;
        });

        // Planet markers INSIDE the wheel.
        //
        // This is the one part of the drawing that is not derivable from the
        // framework tables, so it arrives ready-made:
        //   [{ key, lon, symbol, type: 'design' | 'personality' }]
        // The viewer reads it off the birth chart and the design chart; a
        // script can hand-write it; a glyph passes nothing and gets a bare
        // wheel. The hue is decided here, from the type, so the mandala and
        // the bodygraph cannot end up calling Design two different reds.
        if (o.planets && o.planets.length) {
            const planetsToPlot = o.planets.map(p => ({
                key: p.key,
                lon: p.lon,
                symbol: p.symbol,
                type: p.type === 'design' ? 'design' : 'personality',
                color: p.type === 'design' ? 'var(--bgc-design)' : 'var(--bgc-accent)'
            }));

            // Two rings, and crowding resolved sideways rather than inward.
            //
            // Planets used to be pushed 18px towards the centre for every
            // neighbour within 10°, so a stellium walked inward until its
            // markers sat almost on the hub, where the angle — the only thing
            // a wheel is for — could no longer be read, and they still
            // overlapped. Now Personality keeps one ring and Design another,
            // and inside each ring crowded markers are nudged *along* the ring
            // until they clear, with a hairline back to the true longitude.
            const RING = { personality: 112, design: 84 };

            function spread(group, r) {
                if (!group.length) return [];
                // minimum angular gap that keeps two 10px markers apart at this radius
                const minGap = (23 / r) * 180 / Math.PI;
                const placed = group
                    .map(p => ({ p, lon: p.lon, at: p.lon }))
                    .sort((a, b) => a.lon - b.lon);
                // relax: push neighbours apart, wrapping around the wheel
                for (let pass = 0; pass < 60; pass++) {
                    let moved = false;
                    for (let i = 0; i < placed.length; i++) {
                        const a = placed[i], b = placed[(i + 1) % placed.length];
                        let gap = b.at - a.at;
                        while (gap < 0) gap += 360;
                        if (gap < minGap - 0.001) {
                            const push = (minGap - gap) / 2;
                            a.at = ((a.at - push) % 360 + 360) % 360;
                            b.at = ((b.at + push) % 360 + 360) % 360;
                            moved = true;
                        }
                    }
                    if (!moved) break;
                }
                return placed;
            }

            ['personality', 'design'].forEach(type => {
                const r = RING[type];
                spread(planetsToPlot.filter(p => p.type === type), r).forEach(({ p, lon, at }) => {
                    const trueAngle = (lon - 90) * Math.PI / 180;
                    const angle = (at - 90) * Math.PI / 180;
                    const px = cx + r * Math.cos(angle), py = cy + r * Math.sin(angle);
                    // hairline from the marker out to where the planet really
                    // is, stopping just short of the inner zodiac band
                    const tx = cx + (innerZodiacInnerR - 3) * Math.cos(trueAngle);
                    const ty = cy + (innerZodiacInnerR - 3) * Math.sin(trueAngle);
                    svg += `<line x1="${px}" y1="${py}" x2="${tx}" y2="${ty}" stroke="${p.color}" stroke-width="0.7" opacity="0.35"/>`;
                    svg += `<circle cx="${px}" cy="${py}" r="10" fill="var(--bgc-surface)" stroke="${p.color}" stroke-width="2"/>`;
                    svg += `<text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" fill="${p.color}" font-size="11" font-weight="bold">${p.symbol}</text>`;
                });
            });
        }

        svg += '</svg>';
        return svg;
    }

    // ------------------------------------------------------------
    // The mandala's legend is HTML, not SVG: utility classes and a real
    // <button> that flips the ring between tropical and sidereal. It stays
    // out of the SVG string — a drawing carrying markup that only one page
    // can render is not a drawing anyone else can use — and the viewer
    // appends it after the SVG, exactly as it always did.
    //
    // toggleHDZodiacMode() is the viewer's own function, so a caller
    // without one wants { interactive: false } and the swatches alone.
    // ------------------------------------------------------------
    function mandalaLegendHTML(opts) {
        const o = mergeOpts(opts);
        const hdZodiacMode = o.zodiacMode;
        // Whitespace inside these two literals is part of the HTML. Leave it.

        const swatches = `
                <div class="flex justify-center gap-4 mt-3 text-xs flex-wrap" style="color: var(--bgc-mut)">
                    <div class="flex items-center gap-1.5">
                        <div class="w-3 h-3 rounded-full" style="background: var(--bgc-accent)"></div>
                        <span>Personality (Birth)</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <div class="w-3 h-3 rounded-full" style="background: var(--bgc-design)"></div>
                        <span>Design (88° before)</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <div class="w-3 h-3 rounded-full" style="background: var(--bgc-both)"></div>
                        <span>Both</span>
                    </div>
                </div>`;
        const toggle = `
                <div class="flex justify-center mt-2">
                    <button onclick="toggleHDZodiacMode()" class="px-3 py-1 text-xs rounded-full ${hdZodiacMode === 'tropical' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'} hover:opacity-80 transition-opacity">
                        ${hdZodiacMode === 'tropical' ? '♈ Tropical' : '⭐ Sidereal'} Zodiac
                    </button>
                </div>`;
        return swatches + (o.interactive ? toggle : '') + `
            `;
    }

    // ============================================================
    // THE BODYGRAPH — nine centres, thirty-six channels, sixty-four gates.
    // Was renderHDBodygraph() in the viewer.
    // ============================================================
    function renderBodygraph(activations, opts) {
        const A = normalize(activations);
        const o = mergeOpts(opts);

        // ---- Harmony renderer: orderly gates on each centre, curved channels, two colours ----
        // The extra 30 units of height are the legend's own strip: it used to
        // sit at y=614 and run straight across the Root centre and its gates.
        // A further 24 hold the selection legend's second line. That row is
        // only drawn while something is selected, but the box is the same
        // height either way — a viewBox that grew on tap would resize the
        // whole board under the finger that tapped it.
        const VB_W = o.viewBox.w, VB_H = o.viewBox.h;

        // Centre layout (standard vertical bodygraph). Gates come from HD_CENTERS[id].gates.
        // Sizes went up a notch (the Throat carries eleven gates, the G eight):
        // at the old sizes the gate discs sat shoulder to shoulder and overlapped
        // each other on the smaller centres.
        const LAY = {
            head:  { x:200, y:68,  shape:'triU', s:36 },
            ajna:  { x:200, y:158, shape:'triD', s:38 },
            throat:{ x:200, y:252, shape:'sq',   s:44 },
            g:     { x:200, y:362, shape:'dia',  s:44 },
            heart: { x:314, y:370, shape:'triR', s:32 },
            spleen:{ x:86,  y:468, shape:'triR', s:40 },
            sacral:{ x:200, y:480, shape:'sq',   s:42 },
            solar: { x:314, y:468, shape:'triL', s:40 },
            root:  { x:200, y:582, shape:'sq',   s:42 }
        };
        function verts(c){ const x=c.x, y=c.y, s=c.s;
            if(c.shape==='triU') return [[x,y-s],[x+s,y+s*0.62],[x-s,y+s*0.62]];
            if(c.shape==='triD') return [[x-s,y-s*0.62],[x+s,y-s*0.62],[x,y+s]];
            if(c.shape==='dia')  return [[x,y-s],[x+s,y],[x,y+s],[x-s,y]];
            if(c.shape==='triR') return [[x-s*0.6,y-s],[x+s*0.85,y],[x-s*0.6,y+s]];
            if(c.shape==='triL') return [[x+s*0.6,y-s],[x-s*0.85,y],[x+s*0.6,y+s]];
            return [[x-s,y-s],[x+s,y-s],[x+s,y+s],[x-s,y+s]];
        }
        function perim(pts,n){ const segs=[]; let tot=0;
            for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length];
                const d=Math.hypot(b[0]-a[0],b[1]-a[1]); segs.push({a,b,d}); tot+=d; }
            const out=[], step=tot/n; let dist=step/2;
            for(let k=0;k<n;k++){ const tgt=dist+k*step; let acc=0;
                for(let s=0;s<segs.length;s++){ if(acc+segs[s].d>=tgt){ const f=(tgt-acc)/segs[s].d;
                    out.push([segs[s].a[0]+(segs[s].b[0]-segs[s].a[0])*f, segs[s].a[1]+(segs[s].b[1]-segs[s].a[1])*f]); break; } acc+=segs[s].d; } }
            return out;
        }

        // gate -> centreId, and the centre each of its channel partners sits in
        const GCEN = {}, PARTNERS = {};
        Object.keys(LAY).forEach(id => {
            ((HD_CENTERS[id] && HD_CENTERS[id].gates) || []).forEach(g => GCEN[g] = id);
        });
        Object.keys(HD_CHANNELS).forEach(id => {
            const [a,b] = id.split('-').map(Number);
            (PARTNERS[a] = PARTNERS[a] || []).push(b);
            (PARTNERS[b] = PARTNERS[b] || []).push(a);
        });

        // Gates still sit evenly around their centre's edge — that even spacing
        // is the look — but they are no longer placed in numerical order. Each
        // gate wants to face the centre its channel runs to, so the slots are
        // handed out by direction: the wheel of evenly spaced slots is rotated
        // to whichever offset best matches where each gate is pulled. Channels
        // then leave from the side they are going to, instead of crossing the
        // whole body to reach a partner sitting on the far edge.
        const GP = {};
        Object.keys(LAY).forEach(id => {
            const c = LAY[id];
            const gates = (HD_CENTERS[id] && HD_CENTERS[id].gates) || [];
            const slots = perim(verts(c), gates.length);
            const ang = p => Math.atan2(p[1] - c.y, p[0] - c.x);
            // where each gate is pulled: the mean direction of its partners' centres
            const pull = gates.map(g => {
                let sx = 0, sy = 0;
                (PARTNERS[g] || []).forEach(p => {
                    const other = LAY[GCEN[p]];
                    if (!other || GCEN[p] === id) return;
                    const d = Math.hypot(other.x - c.x, other.y - c.y) || 1;
                    sx += (other.x - c.x) / d; sy += (other.y - c.y) / d;
                });
                return (sx === 0 && sy === 0) ? null : Math.atan2(sy, sx);
            });
            // keep the gates in their given order around the ring, then rotate
            // the ring to the offset with the least total pull-vs-slot error
            const slotAng = slots.map(ang);
            let best = 0, bestCost = Infinity;
            for (let off = 0; off < gates.length; off++) {
                let cost = 0;
                gates.forEach((g,i) => {
                    if (pull[i] === null) return;
                    let d = Math.abs(slotAng[(i + off) % gates.length] - pull[i]);
                    if (d > Math.PI) d = 2 * Math.PI - d;
                    cost += d;
                });
                if (cost < bestCost) { bestCost = cost; best = off; }
            }
            gates.forEach((g,i) => { GP[g] = slots[(i + best) % gates.length]; });

            // Even spacing *along the edge* still bunches at a sharp corner —
            // two slots either side of the Splenic or Solar Plexus point end up
            // almost on top of each other. Ease any pair that lands closer than
            // a disc's width apart, sliding them along the edge they share.
            const here = gates.map(g => GP[g]);
            for (let pass = 0; pass < 12; pass++) {
                let moved = false;
                for (let i = 0; i < here.length; i++) {
                    for (let j = i + 1; j < here.length; j++) {
                        const dx = here[j][0]-here[i][0], dy = here[j][1]-here[i][1];
                        const d = Math.hypot(dx, dy);
                        if (d >= 20.5 || d === 0) continue;
                        const push = (20.5 - d) / 2, ux = dx/d, uy = dy/d;
                        here[i] = [here[i][0]-ux*push, here[i][1]-uy*push];
                        here[j] = [here[j][0]+ux*push, here[j][1]+uy*push];
                        moved = true;
                    }
                }
                if (!moved) break;
            }
            gates.forEach((g,i) => { GP[g] = here[i]; });
        });

        // defined state from the real chart
        const defChSet = A.channels;
        const defCenters = A.centers; // Set of centre ids
        function gateActive(g){ return A.gates.has(g); }

        let svg = `<svg viewBox="0 0 ${VB_W} ${VB_H}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="background:transparent;display:block">` + styleTag(o);

        // ---- 0. tap the empty board to clear the selection ----
        svg += `<rect class="hd-hit" x="0" y="0" width="${VB_W}" height="${VB_H}" fill="transparent" `
            + `${tapClear(o)}/>`;

        // ---- 1. channels as gently bowed curves. Undefined first (faint), defined on top. ----
        // Each channel is one <g class="hd-ch"> holding its tap target and
        // its visible stroke, so applySelectionToHD() can lift a selected
        // channel to the top of the layer as a unit — a 4.4px selected
        // stroke used to be able to sit *under* a defined channel drawn
        // later in the same pass.
        function channelPath(id){
            const [g1,g2] = id.split('-').map(Number);
            const p1 = GP[g1], p2 = GP[g2]; if(!p1||!p2) return '';
            const def = defChSet.has(id);
            const mx=(p1[0]+p2[0])/2, my=(p1[1]+p2[1])/2;
            const dx=p2[0]-p1[0], dy=p2[1]-p1[1], len=Math.hypot(dx,dy)||1;
            let nx=-dy/len, ny=dx/len;
            // a gentler bow: with the gates now facing their partners the long
            // swooping arcs were doing nothing but crossing each other
            const bow=Math.min(12, len*0.09);
            if((mx<200&&nx>0)||(mx>200&&nx<0)){ nx=-nx; ny=-ny; }
            const cx=mx+nx*bow, cy=my+ny*bow;
            const d = `M ${p1[0]} ${p1[1]} Q ${cx} ${cy} ${p2[0]} ${p2[1]}`;
            // Two paths per channel: the visible stroke, and a fat
            // transparent one behind it so a 1.2px hairline is still
            // tappable with a thumb (join key = the gate pair).
            return `<g class="hd-ch" data-ch="${id}">`
                + `<path class="hd-hit" d="${d}" fill="none" stroke="transparent" stroke-width="14" `
                    + `${tapChannel(o, id)}>`
                    + `<title>${id} — ${HD_CHANNELS[id].name}${def?' (defined)':' (not defined in this chart)'}</title></path>`
                + `<path class="hd-channel" data-hd-channel="${id}" data-def="${def?1:0}" d="${d}" fill="none" `
                + `stroke="${def?'var(--bgc-accent)':'var(--bgc-dim)'}" stroke-width="${def?3.4:1.2}" `
                + `stroke-linecap="round" opacity="${def?1:0.32}" style="pointer-events:none"/>`
                + `</g>`;
        }
        const chIds = Object.keys(HD_CHANNELS);
        svg += `<g class="hd-layer-channels">`;
        chIds.forEach(id => { if(!defChSet.has(id)) svg += channelPath(id); });
        chIds.forEach(id => { if(defChSet.has(id)) svg += channelPath(id); });
        svg += `</g>`;

        // ---- 2. centres (rounded), clickable ----
        Object.keys(LAY).forEach(id => {
            const def = defCenters.has(id);
            const pts = verts(LAY[id]).map(p => p.join(',')).join(' ');
            // an open centre outlined in --bgc-line was all but invisible on the
            // dark plate — the nine shapes are the frame of the whole drawing,
            // so an open one is drawn in --bgc-dim and still reads as empty
            svg += `<polygon class="hd-center" data-hd-center="${id}" data-def="${def?1:0}" points="${pts}" fill="${def?'var(--bgc-accent-soft)':'var(--bgc-surface)'}" `
                + `stroke="${def?'var(--bgc-accent)':'var(--bgc-dim)'}" stroke-width="${def?2.4:1.6}" `
                + `stroke-linejoin="round" ${tapCenter(o, id)}>`
                + `<title>${(HD_CENTERS[id]&&HD_CENTERS[id].name)||id}${def?' — defined':' — open'}</title></polygon>`;
        });

        // ---- 3. gates: even, numbered, clickable ----
        // The two legend pills used to render byte-identical SVG (audit §2.7).
        // They now mean what they say. BY ACTIVATION colours each active gate
        // by which side switched it on — Design red, Personality accent, both
        // sides gold, the standard Human Design reading and the same red/purple
        // the gates list below already uses. BY CENTRE drops the activation
        // colouring and reads the board as nine centres: every active gate in
        // the one accent, so what stands out is which centres are lit.
        const byActivation = o.legendMode === 'activation';
        function gateFill(act) {
            if (!byActivation) return 'var(--bgc-accent)';
            if (act === 'both') return 'var(--bgc-both)';
            if (act === 'design') return 'var(--bgc-design)';
            return 'var(--bgc-accent)';
        }
        function gateInk(act) {
            if (!byActivation) return 'var(--bgc-gate-on-text)';
            if (act === 'both') return 'var(--bgc-gate-on-text-warm)';
            if (act === 'design') return '#ffffff';
            return 'var(--bgc-gate-on-text)';
        }
        for (let g=1; g<=64; g++){
            const p = GP[g]; if(!p) continue;
            const on = gateActive(g);
            const cen = GCEN[g];
            // BY CENTRE drops the by-side hue on purpose — that reading is
            // about which centres are lit. data-act carries the true
            // activation either way, because the selection layer has to
            // recede a dormant gate further than an activated one in BOTH
            // readings, and it cannot tell them apart from the fill alone.
            const act = gateActivation(A, g);
            const fill = on ? gateFill(act) : 'var(--bgc-surface)';
            // r 8 / 7.5px type left the numbers at four or five screen pixels
            // once the 400-wide board was scaled into the panel — unreadable
            svg += `<circle class="hd-gate" data-hd-gate="${g}" data-act="${act}" cx="${p[0]}" cy="${p[1]}" r="9.6" fill="${fill}" `
                + `stroke="${on?fill:'var(--bgc-dim)'}" stroke-width="${on?0:1.4}" `
                + `${tapGate(o, g, 'bodygraph')}>`
                + `<title>Gate ${g}${HD_GATE_MEANINGS[g]?(' — '+HD_GATE_MEANINGS[g].name):''} (${(HD_CENTERS[cen]&&HD_CENTERS[cen].name)||''})${HD_ACT_WORDS[act]}</title></circle>`;
            svg += `<text class="hd-gate" data-hd-gate="${g}" data-act="${act}" x="${p[0]}" y="${p[1]+3.4}" text-anchor="middle" font-size="9.5" font-weight="700" `
                + `font-family="ui-monospace,Menlo,monospace" fill="${on?gateInk(act):'var(--bgc-mut)'}" style="pointer-events:none">${g}</text>`;
        }
        if (o.legend) {
            // ---- 4. compact legend ----
            // Line one is the ACTIVATION layer, in whichever reading the pills
            // have chosen. Line two names the SELECTION layer and is shown only
            // while something is selected — otherwise the reader is left to
            // infer the dimming rule from the dimming itself. It is always
            // emitted and hidden in CSS off .hd-focus, so a selection change
            // never has to rebuild the drawing.
            svg += `<line x1="24" y1="638" x2="376" y2="638" stroke="var(--bgc-line)" stroke-width="1"/>`;
            svg += `<g transform="translate(${byActivation ? 42 : 58}, 657)" font-family="-apple-system,Segoe UI,sans-serif" font-size="11" fill="var(--bgc-mut)">`;
            if (byActivation) {
                svg += `<circle cx="0" cy="-3.5" r="5.5" fill="var(--bgc-accent)"/><text x="11" y="0">Personality</text>`
                    + `<circle cx="90" cy="-3.5" r="5.5" fill="var(--bgc-design)"/><text x="101" y="0">Design</text>`
                    + `<circle cx="155" cy="-3.5" r="5.5" fill="var(--bgc-both)"/><text x="166" y="0">Both</text>`
                    + `<line x1="212" y1="-3.5" x2="232" y2="-3.5" stroke="var(--bgc-accent)" stroke-width="3.4" stroke-linecap="round"/><text x="239" y="0">Defined channel</text>`;
            } else {
                svg += `<line x1="0" y1="-3.5" x2="20" y2="-3.5" stroke="var(--bgc-accent)" stroke-width="3.4" stroke-linecap="round"/><text x="27" y="0">Defined</text>`
                    + `<line x1="94" y1="-3.5" x2="114" y2="-3.5" stroke="var(--bgc-dim)" stroke-width="1.2" stroke-linecap="round" opacity="0.32"/><text x="121" y="0">Undefined</text>`
                    + `<circle cx="216" cy="-3.5" r="5.5" fill="var(--bgc-accent)"/><text x="227" y="0">Active gate</text>`;
            }
            svg += `</g>`;
            svg += `<g class="hd-legend-sel" transform="translate(30, 678)" font-family="-apple-system,Segoe UI,sans-serif" font-size="11" fill="var(--bgc-mut)">`
                + `<circle cx="0" cy="-3.5" r="5.5" fill="var(--bgc-accent)" stroke="var(--astro-gold)" stroke-width="2.4"/>`
                + `<text x="12" y="0">Selected</text>`
                + `<circle cx="74" cy="-3.5" r="5.5" fill="var(--bgc-accent)" opacity="0.5"/>`
                + `<text x="86" y="0">Activated</text>`
                + `<circle cx="152" cy="-3.5" r="5.5" fill="var(--bgc-surface)" stroke="var(--bgc-dim)" stroke-width="1.4" opacity="0.35"/>`
                + `<text x="164" y="0">Dormant</text>`
                + `<line x1="216" y1="-3.5" x2="234" y2="-3.5" stroke="var(--astro-gold)" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>`
                + `<text x="241" y="0">Selected, undefined</text>`
                + `</g>`;
        }

        svg += '</svg>';
        return svg;
    }

    return {
        renderBodygraph: renderBodygraph,
        renderMandala: renderMandala,
        mandalaLegendHTML: mandalaLegendHTML,
        // The framework itself, so nothing downstream has to copy it. The
        // viewer aliases these to the names its call sites already use.
        tables: {
            HD_GATE_ORDER: HD_GATE_ORDER,
            HD_WHEEL_START: HD_WHEEL_START,
            HD_GATE_ARC: HD_GATE_ARC,
            HD_LINE_ARC: HD_LINE_ARC,
            HD_GATE_SEQUENCE: HD_GATE_SEQUENCE,
            HD_CENTERS: HD_CENTERS,
            HD_GATE_TO_CENTER: HD_GATE_TO_CENTER,
            HD_CHANNELS: HD_CHANNELS,
            HD_GATE_MEANINGS: HD_GATE_MEANINGS,
            HD_ACT_WORDS: HD_ACT_WORDS
        },
        // Structure, exported because re-deriving it is how drift starts.
        gateFromLongitude: getHDGateFromLongitude,
        gateActivation: gateActivation,
        normalize: normalize,
        PALETTE: PALETTE,
        paletteCSS: paletteCSS
    };
}));

