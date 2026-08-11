/**
 * Projects catalogue.
 *
 * Add a project by appending an entry to PROJECTS:
 *
 *   {
 *     id:          "p_002",                                 // unique, stable
 *     title:       "Project Name",
 *     year:        2025,                                    // optional, number
 *     kind:        "CODE",                                  // small badge label (CODE, WRITING, MUSIC, etc.)
 *     summary:     "One-line tagline.",                     // optional
 *     description: "Longer paragraph about the project.",  // optional
 *     url:         "https://example.com",                   // optional external link
 *     image:       "assets/projects/cover.jpg",             // optional
 *   }
 *
 * Drop project images into portfolio/assets/projects/.
 */

const PROJECTS = [
  // Example entry — replace with your own.
  // {
  //   id: "p_001",
  //   title: "Algorithmic Composition Tool",
  //   year: 2025,
  //   kind: "CODE",
  //   summary: "A browser-based sequencer for generative music.",
  //   description: "Built with the Web Audio API. Lets you define rules that generate melodies and drum patterns.",
  //   url: "https://example.com",
  // },
  {
  id: "p_001",
  title: "B&O Surround Sound for MythsEnt premiere",
  year: 2026,
  kind: "On-hands system routing",
  summary: "Installed B&O Beosystem 1 surround sound system for the premiere event of the MythsEnt archival library/school.",
  description: "Used for speeches, musical performances, visual presentations, and anything requiring audio. This involved routing each tower speaker through wall ports into a main panel housing all the ports, which fed into the console connected to the B&O system. Spent time mitigating electrical interference and streamlining each wired connection for the quickest possible response times. Connected a channel switcher between the console and sound system, which accommodated Bluetooth, wired USB-C, and USB-A connections.",
  url: "https://mythsent.com/",
  image: "assets/projects/IMG_5713.jpg"
  },

  {
  id: "p_002",
  title: "Tracking & Engineering W/DontKallMeLuxxy",
  year: 2026,
  kind: "Tracking/Vocal Engineering",
  summary: "Tracked and recorded vocals for DontkallMeLuxxys “Stadiums”",
  description: "Spent a weekend with Luxxy living in a NJ recording studio grinding tracks, it was a really fun and rewarding experience that I’m glad I could be a part of. Each day we recorded around 5-7 tracks and by the end of the trip we had 15 tracks ready to send off for mastering then release. Still engineer and record together to this day.",
  url: "https://youtu.be/TYG2YxGns0c?si=HDm-9VLG1D_yB24C",
  image: "assets/projects/Luxxy.jpg"
  }
];