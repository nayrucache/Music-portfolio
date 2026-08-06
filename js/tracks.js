/**
 * Track catalogue.
 *
 * Add a track by appending an entry to TRACKS:
 *
 *   {
 *     id:      "t_002",                           // unique, stable
 *     title:   "Track Name",
 *     artist:  "Your Name",
 *     src:     "assets/audio/your-file.mp3",      // relative to index.html
 *     duration: 0,                                // optional; auto-detected on load
 *     cover:   "assets/covers/your-image.jpg"     // optional
 *   }
 *
 * Then drop the audio file into portfolio/assets/audio/.
 */

const TRACKS = [
  // Example entry — replace with your own tracks.
  // {
  //   id: "t_001",
  //   title: "First Light",
  //   artist: "Your Name",
  //   src: "assets/audio/first-light.mp3",
  //   duration: 0,
  // },
  {
  id: "t_001",
  title: "0404",
  artist: ":English",
  src: "assets/audio/0404.wav",
  duration: 104,
  },
  {
  id: "t_002",
  title: "0715",
  artist: ":English",
  src: "assets/audio/0715.wav",
  duration: 60,
  },
  {
  id: "t_003",
  title: "0729",
  artist: ":English",
  src: "assets/audio/0729.wav",
  duration: 94,
  },
  {
  id: "t_004",
  title: "0722",
  artist: ":English",
  src: "assets/audio/0722.wav",
  duration: 62,
  },
];
