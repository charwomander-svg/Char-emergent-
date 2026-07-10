import { Script } from "./types";

// "PIXEL DEEP FEELINGS: A STORY ABOUT MAKING A STORY"
// A visual novel about a studio making a visual novel.
// Runtime: ~35-45 minutes at normal reading pace.
// One ending. Multiple choices. All of them inconsequential.

export const NOVEL_TITLE = "PIXEL DEEP FEELINGS";
export const NOVEL_SUBTITLE = "A Story About Making a Story";
export const NOVEL_VERSION = "v1.0 — Complete Edition (There Is No Other Edition)";

export const SCRIPT: Script = [
  // ─────────────────────────────────────────────
  // OPENING
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "PIXEL DEEP FEELINGS",
    bg: "#0a0a1a",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The following is a work of fiction about people making a work of fiction.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Any resemblance to actual game developers — broke, desperate, or otherwise — is entirely intentional and we are deeply sorry.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "This game was made by people who probably could have spent the time doing something more productive.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "They chose not to.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "You are playing the result.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "We appreciate your continued support of the medium.",
  },

  // ─────────────────────────────────────────────
  // ACT ONE: THE GARAGE
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "ACT ONE: The Corpse of Broken Pixel Games",
    bg: "#0d0d1f",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "It is Monday. More specifically, it is the kind of Monday that makes all other Mondays look like Saturdays.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The headquarters of Broken Pixel Games — formerly a two-car garage, currently a one-dream garage — smells of cold pizza and professionally managed despair.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "A motivational poster on the wall reads: \"FAILURE IS JUST SUCCESS THAT HASN'T GIVEN UP YET.\" It has been stared at so often the paper is starting to look tired.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The full team has assembled. All five of them. This is a crisis meeting. They have crisis meetings every Monday. And most Wednesdays.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Alright, team. Thank you for coming on short notice.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Dirk, we live three blocks away and you texted us at 8 AM on a Sunday.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "It was important.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Your text just said 'uh oh.' That was the entire message.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "I was still gathering my thoughts.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Is it the money?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "...Yes.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "How bad?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "You know how I said last month we had a runway of six months?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "You were very confident about that. You made a slide deck.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "I was wrong. We have a runway of six dollars.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "...Dollars or months?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Dollars. Six actual American dollars. I found them in the couch cushions this morning.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "That's actually my money. I lost it last Tuesday.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Dave, I spent it on coffee for this meeting.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "There's no coffee.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "I needed the walk.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "There is a long silence. The motivational poster watches.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "So. We are, to use the technical term—",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Broke.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Extraordinarily broke. The thesaurus kind. We are impecunious. Destitute. Fiscally—",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Dirk.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Dead. We're financially dead.",
  },

  // ─────────────────────────────────────────────
  // THE EULOGY OF PAST GAMES
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "THE FAILURES — A BRIEF EULOGY",
    bg: "#12001a",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "To understand how Broken Pixel Games arrived at this moment, one must understand their history. It is a history of ambition, innovation, and a nearly superhuman inability to ship anything remotely playable.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Their first game: 'ROYALE FIGHT ZONE 99.' A battle royale with 'revolutionary' destructible environments. The destruction worked fine. Unfortunately, so did the spawn system, which deleted players instead of enemies.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "They published it anyway. It received one review: 'My character fell through the map and into what appeared to be Norway. 1 star.'",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Their second attempt: 'CRYPTOQUEST: BLOCKCHAIN DUNGEON' — launched six months after NFTs became professionally embarrassing. The game required players to pay forty dollars to mint their character before they could see the tutorial.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The tutorial was a forty-seven slide PowerPoint about the benefits of decentralized ownership. Nobody reached slide two. Several people reached slide one and then closed their laptops and went outside.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Third: 'KARATE VOID.' A fighting game whose only character was a placeholder cube named 'Cube1_final_FINAL_v3.' Priya insists the physics on the cube were technically groundbreaking.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "She is probably right. Nobody will ever know.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Fourth: 'WHISPERS OF THE ETERNAL REALM: A SAGA OF THE AGES, BOOK ONE: PROLOGUE (PART A).' An open-world RPG with six quests, all of which were collecting mushrooms. The main villain was named Bad Man.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The ending was a text screen that said 'TO BE CONTINUED (maybe).' It was not continued.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Fifth: 'BEAT DROP EXTREME HYPER ULTIMATE.' A rhythm game with no music licensing budget. All songs were hummed by Dirk into his phone microphone.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Yuki described the title screen as 'the most unsettling image I have ever seen.' She grew up near an industrial plant.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "And now, they have nothing. Less than nothing. They have negative nothing, which is a number that exists only in the accounting software of failed indie studios.",
  },

  // ─────────────────────────────────────────────
  // BACK TO THE MEETING
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "THE GARAGE — MOMENTS LATER",
    bg: "#0d0d1f",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "So. New game. We need ideas. Anyone got something?",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Social casino.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "We tried that. We got a cease and desist from three governments simultaneously.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "That was incredible PR, actually.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "It was not. What else?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I've been working on optimizing the Omega Physics Engine. We could build a realistic fluid simulation game. Water dynamics, non-Newtonian behavior, surface tension—",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Priya, you've been building that engine for three years.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Three years and four months.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Has it ever appeared in a game?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "...KARATE VOID used it for the cube.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "The cube was a cube.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It was a very physically accurate cube.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "What if we just made something... smaller?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "How small?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Okay. Don't laugh.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Marcus, we are professionally bankrupt. We have no laughs left. They were repossessed.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Visual novel.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "There is a silence that is either contemplative or horrified. It is genuinely difficult to tell.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I'm sorry?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "A visual novel. Hear me out.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "You want us. Broken Pixel Games. Us. To make a visual novel.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "It is strategically sound.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "This is incredible. This might be the worst idea in company history.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Dave. We made CryptoQuest.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "...Go on.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I've been doing research. Visual novels consistently sell. They have a dedicated fanbase that actually buys games — which, historically, has not been our primary demographic.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Our primary demographic has been 'confused people who clicked the wrong Steam link.'",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Exactly. This is a pivot. The production requirements are— and I want everyone to appreciate how I'm choosing my words here — flexible.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Define 'flexible.'",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "You could, theoretically, make a commercially viable visual novel with stock photography, some ambient music from a royalty-free library, and a script.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Stock photography.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "With filters.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "That's — that can't be legal. There should be some sort of quality floor. Some regulatory body.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "There isn't. I checked.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Wait.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Wait, wait, wait. Are you telling me — and I need you to be precise — that for this genre, I could use stock photos?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "With filters, yes. And perhaps some tasteful vignette.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I have hand-drawn assets for four games. Four. I drew a 3D model of a cube from scratch for KARATE VOID. In Blender. With no prior Blender experience.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I know.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I gave that cube eyelashes. Nobody asked for that. I just did it. Because I cared.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The cube was very expressive, Yuki.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "And you're telling me I can use a photo of like — a park bench. Just a photo. Maybe make it slightly warm. And that's art.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "That's the genre, yes.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I'm in.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "We haven't decided anything yet.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I'm in regardless. Next question.",
  },

  // ─────────────────────────────────────────────
  // CHOICE 1
  // ─────────────────────────────────────────────
  {
    type: "choice",
    prompt: "Should the studio make a visual novel? (Note: this decision has already been made.)",
    options: [
      {
        text: "Yes. It's the only logical move.",
        reaction:
          "You chose yes. The narrative nods approvingly and continues exactly as planned.",
      },
      {
        text: "Absolutely not. We have standards.",
        reaction:
          "You chose no. The story respects your input and continues exactly as planned anyway. Thank you for your participation.",
      },
    ],
  },

  // ─────────────────────────────────────────────
  // PRIYA'S OBJECTION
  // ─────────────────────────────────────────────
  {
    type: "dialog",
    speaker: "priya",
    text: "Can I just say something, for the record?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Priya—",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I built the Omega Physics Engine over three years and four months. It can simulate forty thousand rigid body objects simultaneously. It has a custom spatial partitioning algorithm. It handles continuous collision detection at sub-millisecond precision.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Priya, I know—",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "And you're telling me that for this project, the 'engine' will be a dialogue box.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "A well-crafted dialogue box.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It's a text container with a next button.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "With character names. And some nice visual treatment.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I went to MIT.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "And you'll bring that MIT energy to an absolutely exceptional text box.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Fine. Fine. I will build the most technically immaculate text display system in the history of the visual novel medium.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "There we go.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "And when I'm done, I'm going to be very sad about it.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "That's the spirit.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "What's the story? What's our visual novel about?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I have a concept. It's called 'Unspoken Melody: A Story of Notes and Hearts.'",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Is there a twist?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Dave, I haven't even described it yet.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Is there a twist.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "A young pianist at a prestigious music academy. She falls in love with a violinist. Their music intertwines as their feelings deepen. Against the backdrop of—",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "What's the twist.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "There isn't one. It's a character study. It's about the nature of connection through artistic expression.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Nobody's going to buy that.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Dave. It's a visual novel. People buy these for feelings. They want to feel something in their chest that isn't caffeine.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "I could market a twist.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "There is no twist.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "What if one of them is a ghost?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "She's not a ghost.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "She could be a ghost and then it would be a twist.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Mireille is a living violinist, Dave.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "...For now.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "FOR NOW?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Okay! We'll table the ghost question. Research phase starts today. Everyone go play some visual novels. We reconvene Friday.",
  },

  // ─────────────────────────────────────────────
  // ACT TWO: THE RESEARCH PHASE
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "ACT TWO: The Research Phase (48 Agonizing Hours)",
    bg: "#0a1a0a",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "They research. They download visual novels. They play visual novels. They have extremely strong and largely contradictory opinions about visual novels.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Priya finishes her first visual novel in three hours. She sits in silence for twenty minutes afterward, staring at the wall.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It was actually... kind of moving?",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "She immediately resents this.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I mean, structurally it's just — the UX is fine, it's nothing special — the text box was not optimized — there was almost certainly unnecessary re-rendering on the character portraits—",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "She plays three more. She finishes them all. She does not mention this to anyone.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Dave downloads fifteen visual novels. He reads the opening screens of each one and then closes them to look at the title art.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "The branding on all of these is wildly inconsistent. I could fix this. Someone should fix this. This is a market gap.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "He writes a twelve-point brand strategy document. It contains the phrase 'emotional synergy' four times. Nobody reads it.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Yuki discovers a visual novel made entirely with photos of empty rooms and a Gaussian blur effect. She studies it the way art historians study the Sistine Chapel.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "This is... this is all it takes? Genuinely? Just a room? With blur?",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "She takes a photo of their garage. Applies vignette. Reduces saturation slightly. Names the file 'ch01_bg_waiting_room_of_dreams.jpg.'",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "It looks like a garage. With a filter. It is the most art she has felt in four years.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Marcus writes for forty-eight hours. He eats crackers. He forgets to sleep. When Dirk checks on him, Marcus looks up with the eyes of a man who has seen something.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "How's the script coming?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I've written forty-two thousand words.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "In two days.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I was waiting for this. My whole life, Dirk. The rhythm game, the battle royale — I was just waiting for something I could actually write.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Marcus, you wrote the KARATE VOID storyline.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The KARATE VOID storyline was 'cube fights.'" ,
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "There was lore.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I put a question mark after Bad Man's name in the lore doc and called it 'mystery.' This is different. This is real. This is a story about two people who find each other through music at the exact moment when music is the only thing holding either of them together.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Marcus, are you okay?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I'm genuinely doing great for the first time in years. It's alarming.",
  },

  // ─────────────────────────────────────────────
  // FRIDAY MEETING
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "FRIDAY — THE GARAGE — STATUS MEETING",
    bg: "#0d0d1f",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Alright, let's hear it. Priya, what does the engine look like?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "The engine is done.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Already?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It is a React component. It has a text display area, a character name label, a next button, and a choice rendering system. It is approximately two hundred lines of code.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "That's—",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "For context, the Omega Physics Engine is one hundred and twelve thousand lines. I spent four months alone on the broad-phase collision detection. Two months on the constraint solver. I once debugged a single floating point error for eleven days.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "This was two hundred lines. In a day and a half. Mostly JSX.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Does it work?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It works perfectly. It's the most functional thing we've ever shipped. I hate everything about this.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Priya, this is a win.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It is a win for people who have given up, Dirk. I have not given up. I have temporarily pivoted. There is a difference and I will maintain it in my heart.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I have forty-seven backgrounds.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Yuki, we have—what, ten scenes?",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I know. Some of them are variations. I took the same photo of a park and applied Warmth filter, Melancholy filter, and Late Evening filter. They're technically three different locations.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "They're the same park.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "With different emotional registers. That's art.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Character sprites?",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I drew Elena and Mireille. The supporting characters are stock illustrations I found on a royalty-free site. I gave one of them a hat. Her name is Sasha. She represents — thematically — the weight of unfulfilled expectation.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Does the story take place in Russia?",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "The story takes place in a prestigious European music academy of unspecified nationality.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "So Sasha's hat is—",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Symbolic.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Brilliant.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Marcus. Script status?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The script is complete. Forty-five thousand words. I've also written a sixteen-page document on the thematic relationship between music and grief in the post-romantic tradition, which I'm calling 'supplemental material.'",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Is that in the game?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "It is not. It is for me.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Dave. Marketing?",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "I created an X account for the studio. The bio is 'We make games.' I posted a screenshot of the dialogue box with the caption: 'something is coming.'",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "How many likes?",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Seven. One of them was me. One was a cryptocurrency bot. The other five are a genuine mystery that I choose to interpret as grassroots interest.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Great. We're on schedule. Let's talk development timeline.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I want to discuss the choice system.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "What about it?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "In our visual novel — 'Unspoken Melody' — I notice the choices I've implemented don't... actually affect anything. The player picks an option and then the story continues on the same path.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "They give the player agency.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "The player selects a different string and then the same event occurs.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The illusion of agency is functionally equivalent to agency if the player doesn't analyze the branch logic.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "That's the most philosophically disturbing thing you've ever said.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Thank you.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It wasn't a compliment.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I made a choice about how to receive it. Isn't that beautiful?",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Priya stares at Marcus for a very long time.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I hate this so much. I'm going to finish it.",
  },

  // ─────────────────────────────────────────────
  // ACT THREE: DEVELOPMENT
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "ACT THREE: The Development Cycle (All Seven Days of It)",
    bg: "#1a0a0a",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "They develop. By the standards of Broken Pixel Games, this goes remarkably well, which means it goes in a way that any other studio would describe as 'concerning.'",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Day One: Priya integrates the script. She writes a test. The test checks if the text box displays text. It passes. She marks this as a milestone.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Day Two: Yuki discovers that fourteen of her backgrounds have inconsistent color grading because she used two different filter apps. She spends three hours debating whether this is a problem.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "It could be an artistic choice.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "She decides it is an artistic choice. She labels it 'intentional chromatic variance.' She goes home.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Day Three: Dirk suggests they need more settings options. Priya adds a text speed toggle.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "What are the speed options?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Slow. Normal. Fast. And 'Why Are You Even Here.'",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Is 'Why Are You Even Here' a speed setting?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It displays all text instantly. It makes every choice irrelevant by revealing the inconsequence immediately. It is the most honest setting we offer.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I love it.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Also, I added a 'Skip Everything' button. It shows you the final screen in forty seconds.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Why would we — why would anyone — want that?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "For players who want the achievement without the experience. I've met them in the wild. They're numerous.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "There's an achievement?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Three. 'Chapter One Complete.' 'Chapter Two Complete.' And 'You Actually Read All of This,' which has an unlockable icon. It's a thumbs up.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "The thumbs up should wink.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I am not adding animation to a thumbs up.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Brand voice.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Dave. Our brand voice is 'please purchase this.'",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Day Four: Marcus begins editing. He cuts eighteen thousand words from the script and immediately puts sixteen thousand of them back.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "He finds a typo in Chapter Three: 'the moon feel heavy and full.' He changes it to 'the moon fell heavy and full.' He considers this the most important work he has done all week.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "This is accurate.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Day Five: Dave runs social media. He posts a new screenshot every two hours. He refers to this as 'a content cadence strategy.' He has not looked up what that phrase means.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Day Six: Quality assurance. Priya's one test still passes. They agree this is sufficient.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Day Seven: Launch preparation. Nobody sleeps.",
  },

  // ─────────────────────────────────────────────
  // INTERLUDE: THE VN WITHIN THE VN
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "INTERLUDE: Unspoken Melody — An Excerpt",
    bg: "#1a0a2e",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Your narrator pauses here to share a brief excerpt from 'Unspoken Melody: A Story of Notes and Hearts' — the visual novel Broken Pixel Games is building inside this visual novel.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "This is what they are creating. This is what you are paying for. Or, more precisely, this is what Broken Pixel Games imagines you are paying for.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Scene: A practice room. Late evening. The soft sound of piano keys. Sasha stands near the door in her hat, representing something.",
  },
  {
    type: "dialog",
    speaker: "elena",
    text: "You play beautifully.",
  },
  {
    type: "dialog",
    speaker: "mireille",
    text: "I could say the same of you. Though I suspect you are being... polite.",
  },
  {
    type: "dialog",
    speaker: "elena",
    text: "I am never merely polite. Politeness is the art of lying gracefully. I prefer honesty. When it matters.",
  },
  {
    type: "dialog",
    speaker: "mireille",
    text: "Then I should warn you: I have a tendency to play too loud in the third movement.",
  },
  {
    type: "dialog",
    speaker: "elena",
    text: "...Is that a metaphor?",
  },
  {
    type: "dialog",
    speaker: "mireille",
    text: "Does it need to be?",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Here, Broken Pixel Games has inserted a choice. You may now experience the illusion of narrative control.",
  },

  // ─────────────────────────────────────────────
  // CHOICE 2 — VN WITHIN VN
  // ─────────────────────────────────────────────
  {
    type: "choice",
    prompt: "Elena's response:",
    options: [
      {
        text: "\"Perhaps not.\"",
        reaction:
          "Elena says 'Perhaps not.' The next scene begins. Your choice is noted in a variable nobody reads.",
      },
      {
        text: "\"Everything is a metaphor if you try hard enough.\"",
        reaction:
          "Elena delivers this line with devastating elegance. The next scene begins. The narrative continues identically to the other option. Isn't that something.",
      },
    ],
  },

  {
    type: "dialog",
    speaker: "mireille",
    text: "Then perhaps I'll play softer. Just for you.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The music swells. Sasha adjusts her hat. The credits for this scene would, theoretically, include a stock photo of a Steinway grand and one (1) filter application.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "That excerpt cost approximately eight dollars to produce, including Yuki's royalty-free image license.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Broken Pixel Games will charge $12.99 for the full experience.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Someone will cry.",
  },

  // ─────────────────────────────────────────────
  // NIGHT BEFORE LAUNCH
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "THE NIGHT BEFORE LAUNCH — THE GARAGE, 2 AM",
    bg: "#050510",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The night before launch, nobody sleeps. This is tradition. This is also the primary cause of all their previous launch bugs.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Marcus sits with the script on his laptop. He reads it through one final time. He has memorized large portions of it.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "He is, in the privacy of the 2 AM garage, crying slightly. He would die before admitting this. He does not have to, because everyone else is also slightly crying and pretending not to.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Yuki finishes the title screen. A photo of a grand piano. Melancholy filter. The title 'UNSPOKEN MELODY' in a cursive font she found on a free download site. A tagline beneath it.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "What do you think?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "What's the tagline?",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "'A story of music. And feelings. And also music about feelings.'",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "It's perfect.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I know.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Priya runs her test suite one final time. The test passes. She adds a comment to the code: '# Yes this is the entire test suite. Don't @ me.' She commits it.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Dave writes a press release. It is four paragraphs. The first paragraph is the word 'INCREDIBLE' in the largest font his word processor supports. The remaining paragraphs are lorem ipsum text he forgot to replace.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "He sends it to nine journalists. Eight of the email addresses bounce. The ninth journalist receives it, reads 'INCREDIBLE' and then lorem ipsum, and files it in a folder called 'interesting.'",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Nobody sleeps. The motivational poster watches.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Okay. I want to say something.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It's two in the morning, Dirk.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "I know. I want to say — whatever happens tomorrow — I'm proud of us. We made something.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "We've made things before. They all—",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "We made something different. I don't know. This one feels different.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Sasha has a hat.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Sasha has a hat.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I'm going home to sleep. You're all emotionally compromised.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "She does not go home. She finishes the auto-advance feature, adds an optional sepia mode 'for atmosphere,' and falls asleep at her keyboard around 4 AM.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The sepia mode works perfectly.",
  },

  // ─────────────────────────────────────────────
  // ACT FOUR: LAUNCH DAY
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "ACT FOUR: Launch Day — 10:03 AM",
    bg: "#0d0d1f",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "It's live.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "A pause.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "It's live.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "A longer pause.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Should I—",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Not yet. Give it time.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "It's been a minute.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "A minute is not—",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Oh my god.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "What?",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Eight sales.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Silence.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Eight? In a minute?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "That's — that's eight more than KARATE VOID had in its first week.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "KARATE VOID had four sales in its first week and one of them was Dirk buying it 'to check the store listing.'",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "That's not the point.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "By the end of the first hour: sixty-three sales.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Dave receives a notification. He has been monitoring mentions. He runs back from the hallway. They don't have a hallway. He runs from the corner of the garage where he keeps his desk, which is a folding table.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Someone reviewed it! A visual novel streamer — she has two hundred thousand followers — she said, and I'm reading this exactly: 'I don't normally cover smaller titles but something about this one caught me. The writing is honest. It made me feel something I wasn't expecting to feel on a Tuesday.'",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Honest.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "She said honest.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "We used a stock photo. Sasha doesn't have a real background. I literally couldn't decide what country she was from so she just has a hat.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "The hat conveys longing.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I'm not sure that's—",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Two hundred thousand followers just heard that our hat conveys longing. The hat conveys longing.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "By the end of the day: three hundred and twelve sales.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "By the end of the week: four thousand, one hundred and eight.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Priya refreshes the sales dashboard every fifteen minutes. She has written an algorithm to predict their revenue trajectory. It keeps returning numbers that seem implausible.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I think there's an error in my model.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "What's the model saying?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It's saying we're going to be fine.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "That's not an error, Priya.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "In five years of working here it has always been an error. I'm allowing myself cautious optimism. Emphasis on cautious.",
  },

  // ─────────────────────────────────────────────
  // CHOICE 3
  // ─────────────────────────────────────────────
  {
    type: "choice",
    prompt: "How does the team feel about all of this?",
    options: [
      {
        text: "Proud. Genuinely, unexpectedly proud.",
        reaction:
          "You chose pride. It suits them. It suits you. The story continues as it was always going to.",
      },
      {
        text: "Confused and vaguely ashamed of how little effort it took.",
        reaction:
          "You chose shame. Also valid. Both feelings exist simultaneously in the garage. The story continues as it was always going to.",
      },
    ],
  },

  // ─────────────────────────────────────────────
  // ACT FIVE: ONE MONTH LATER
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "ACT FIVE: One Month Later",
    bg: "#0d1a0d",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "One month after launch, 'Unspoken Melody: A Story of Notes and Hearts' has sold fourteen thousand, two hundred and thirty-one copies.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "By AAA studio standards, this is modest. By Broken Pixel Games standards, this is a miracle that defies both logic and their legal history with three separate regulatory bodies.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The reviews are in. The most common phrases: 'unexpectedly moving,' 'simple but effective,' 'I don't know why I kept reading but I couldn't stop.'",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The most common criticism: 'Sasha's hat doesn't match her outfit in Chapter Two.' Yuki has been forced to publicly address this.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "There are thirty-seven forum posts analyzing the symbolism of Sasha's hat. None of them are correct. Yuki does not correct them. She feels it would be rude.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "We need to talk about next steps.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I'm going to say something, and I need everyone to hear it in the spirit it's intended.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Okay.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I have an offer from a real company. They want me to build distributed systems at scale. Real infrastructure. Real architecture. A standing desk and a desk budget.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Priya—",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "A real chair, Dirk. Not this folding thing. An ergonomic chair. With lumbar support.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "How much did we make?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "After platform fees, taxes, and Dave's 'promotional budget'—",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Those stickers were a legitimate expense.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "—approximately one hundred and twelve thousand dollars.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "A very long silence.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I'll stay.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Yeah?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I want a chair.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Done.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "A good one. Not whatever you find on Facebook Marketplace.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Priya, I'm insulted.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "You bought your monitor from a university 'lost and found.'",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "It was barely scratched.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Good chair, Dirk. That's my condition.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "I think we should do merch.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Dave—",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "A shirt. With Sasha's hat on it.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "...I would actually wear that.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Brand synergy.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "What's the sequel situation?",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "That's what I wanted to discuss. There's clearly appetite for more. The question is—",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Already writing it.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "I hadn't—",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "It's called 'Unspoken Harmony: The Notes We Left Behind.' I started on launch day. It is sixty-three thousand words. It is better than the first one in ways I cannot quantify but feel deeply.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Marcus.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Sasha gets a backstory. And a second hat.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "...Two hats?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Character development.",
  },

  // ─────────────────────────────────────────────
  // THE CONVERSATION
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "LATE AFTERNOON — THE UPGRADED GARAGE",
    bg: "#0d0d1f",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The garage has changed slightly. Priya's new chair arrived. It is, by common agreement, an unreasonably good chair. She has named it The Throne.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "A second motivational poster has been added next to the first. It reads: 'DONE IS BETTER THAN PERFECT.' Priya put it up. She maintains it is ironic. Nobody believes her.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Can I ask something? Can I ask something honestly?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Always.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Is anyone else disturbed by how little we put into this? Like — not in a bad way. In a genuinely philosophical way.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I am disturbed in several ways simultaneously.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I used a photo of a park. I found it on the internet. The piano photo cost me $12. The art budget for 'Unspoken Melody' was twelve dollars. And someone in the reviews said — and I have this memorized — 'I felt the ache of autumn in every scene.' The ache of autumn, Marcus.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The Melancholy filter.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "That was the Melancholy filter. Someone attributed seasonal grief to a slider I moved in an app.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Art is the connection between maker and audience. You made a choice — even a small one — and it landed. That's not nothing.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "The choice was 'which of three filters looks saddest.'",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "And you chose correctly.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I want to contribute to this conversation from a technical angle. I wrote two hundred lines of code. Two. Hundred. The entire game engine — every scene, every choice, every pixel of the interface — is two hundred lines.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "For scale: the Omega Physics Engine is over one hundred thousand lines. I have a subroutine for simulating the moment of inertia of irregular polyhedra that is longer than our entire visual novel engine.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "And which one made money?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Please don't make me say it.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Priya.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "...The dialogue box.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The dialogue box.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I will be integrating the Omega Physics Engine into the sequel. Somehow. I haven't figured out how yet. Mireille's sheet music will have realistic paper flutter dynamics.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "That's—",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I am not negotiating this.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Can I say something?",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Everyone braces slightly.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "I just want to say that my marketing was integral to this success.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Dave, you sent a press release that was mostly lorem ipsum.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "The word 'INCREDIBLE' was real.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "We went viral because a single reviewer with two hundred thousand followers liked Marcus's writing.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "She found us because of my content cadence.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "She found us because she was searching for new visual novels and we were there.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "That's called market presence.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Dave, I love you, but you cannot take credit for us existing.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "My X bio said 'We make games.' Technically that described the product accurately.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I mean. In context. That's actually true.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "We do make games.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "We do make games.",
  },

  // ─────────────────────────────────────────────
  // FINALE
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "ACT SIX: What Have We Learned (Debatable)",
    bg: "#0d0d1f",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Before we start production on the sequel, I want to say something. I want everyone to hear this.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "If this is a speech, I'm timing it. Not out of hostility. For my records.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "We've made six games. Five of them were — and I say this with the love of a man who genuinely believed in every single one — disasters.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The open world RPG mushroom quests were ahead of their time.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Nobody reached the quests, Marcus.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The six people who did seemed fine with them.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Four of them were the development team. And then we made this one. The 'low effort' one. The 'cash grab' one. The one Marcus pitched by starting with 'don't laugh.'",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I maintain the framing was tactically sound.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "And somehow it worked. And I don't think it worked because it was low effort. I think it worked because Marcus put everything he had into the writing. And Yuki found the right feeling in a filter. And Priya made something that ran without breaking — which I realize sounds like a low bar but for us it was Everest.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "There was one bug.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "One bug.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Text box overflow on certain aspect ratios. I fixed it in four minutes.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Four minutes. You once spent eleven days on a floating point error.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "That floating point error was interesting. This was a padding issue.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I want to say something too.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Go ahead.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I've been reading the reviews. Not just the good ones. All of them. And there's this thing that keeps coming up — people say it feels 'real.' Which is funny. Because we faked everything. Sasha is a stock illustration. The academy doesn't exist. The piano photo was taken by a photographer in Prague who had no idea their work would end up in an indie visual novel made in a garage.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "That's basically how all art works.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Is it?",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "You make something out of whatever's available, and if you care about it enough, the caring shows. Even through filters. Even through stock photos. Even through placeholder cubes with eyelashes that nobody asked for.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "I cared about that cube.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I know.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Nobody ever knew.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "I knew.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "There is a pause. The good kind. The kind that earns its silence.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I have a confession.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Okay.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I played our game. The one we made. 'Unspoken Melody.' I played through it completely, on my own time, three days after launch.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "And?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I used the 'Skip Everything' button after the first chapter.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "PRIYA.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I was testing the feature! I wanted to confirm it worked.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "You skipped my writing.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Then I went back and played the whole thing at Slow speed.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Marcus stares at Priya. Priya looks at the wall. The motivational poster looks at everyone.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Slow speed.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Savoring every word. Like a real person. Yes.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "What did you think?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It was fine. It was good. The writing was — it was good, Marcus.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Fine and good?",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "I don't do effusive praise. Fine and good is my ceiling and it's a high ceiling.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "Thank you.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Don't make it weird.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "I'm already writing the sequel marketing plan. The key differentiator is going to be the italic logo.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "The italic—",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "Same logo. Italic. Signals growth. Evolution. Motion.",
  },
  {
    type: "dialog",
    speaker: "yuki",
    text: "Dave, it's just slanted.",
  },
  {
    type: "dialog",
    speaker: "dave",
    text: "DYNAMICALLY slanted. There's a difference.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "There is not.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "Alright. Sequel enters production Monday. Marcus, keep writing. Yuki, more parks. Priya—",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "The paper flutter physics will be ready by Thursday.",
  },
  {
    type: "dialog",
    speaker: "dirk",
    text: "I have genuinely no idea what that means but I support you.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "It's for the sheet music. In the scene where Mireille drops her violin part before the recital. The pages will fall with physically accurate aerodynamic behavior.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "That scene is very emotional.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "The pages will fall correctly. That's all I can promise.",
  },
  {
    type: "dialog",
    speaker: "marcus",
    text: "That might actually make it more emotional.",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "...",
  },
  {
    type: "dialog",
    speaker: "priya",
    text: "Don't tell anyone I'm contributing to the emotional beats. I have a reputation.",
  },

  // ─────────────────────────────────────────────
  // FINAL CHOICE
  // ─────────────────────────────────────────────
  {
    type: "choice",
    prompt: "And with that, the story ends. Or — does it?",
    options: [
      {
        text: "That was genuinely good. Unexpected, but good.",
        reaction:
          "Thank you. Broken Pixel Games will accept that. They'll probably quote it somewhere.",
      },
      {
        text: "I want my twelve ninety-nine back.",
        reaction:
          "Fair. Statistically, you've already gotten your money's worth in time spent. The story ends regardless.",
      },
    ],
  },

  // ─────────────────────────────────────────────
  // EPILOGUE
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "EPILOGUE",
    bg: "#000000",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Six months later, 'Unspoken Harmony: The Notes We Left Behind' releases to twenty-two thousand first-week sales.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Priya's paper flutter physics are praised in three separate reviews. One reviewer describes them as 'a moment of unexpected physical poetry.' Priya prints the review. She keeps it near the Throne.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Dave's italic logo generates a seventeen-post forum thread debating whether it represents 'artistic forward momentum.' Dave does not clarify. He lets people believe.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Yuki uses four park photos in the sequel. All from the same park. All with different filters. A fan creates a thirty-slide slideshow analyzing the 'visual language of place and memory' in the Broken Pixel oeuvre. Yuki reads it twice.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Marcus begins writing a third story. He is not allowed to tell anyone the premise yet. He has told everyone the premise. It involves Sasha's origin story. He cried at his keyboard while writing it.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "He claims this was allergies.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Dirk buys a second motivational poster. It reads: 'KEEP GOING.' He hangs it next to the first two.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "The garage still smells like pizza. But better pizza.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "Broken Pixel Games is still Broken Pixel Games.",
  },
  {
    type: "dialog",
    speaker: "narrator",
    text: "They are, somehow, exactly where they're supposed to be.",
  },

  // ─────────────────────────────────────────────
  // CREDITS
  // ─────────────────────────────────────────────
  {
    type: "scene",
    label: "— THE END —",
    bg: "#000000",
  },
  {
    type: "dialog",
    speaker: "system",
    text: "PIXEL DEEP FEELINGS: A Story About Making a Story",
  },
  {
    type: "dialog",
    speaker: "system",
    text: "Written in approximately the time it takes to write a visual novel script.",
  },
  {
    type: "dialog",
    speaker: "system",
    text: "Engine: A dialogue box with a next button and some nice visual treatment.",
  },
  {
    type: "dialog",
    speaker: "system",
    text: "Art: Colored gradients. (We were honest about it.)",
  },
  {
    type: "dialog",
    speaker: "system",
    text: "Choices: Three. All inconsequential. You noticed. We respect that.",
  },
  {
    type: "dialog",
    speaker: "system",
    text: "Endings: One. There was never going to be more than one.",
  },
  {
    type: "dialog",
    speaker: "system",
    text: "Thank you for reading. Genuinely.",
  },
  {
    type: "dialog",
    speaker: "system",
    text: "Now go outside.",
  },

  { type: "end" },
];
