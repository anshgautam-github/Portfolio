// Original illustrated "driver" figure: blue helmet with swirl livery + patterned jacket.
const SWIRLS = [
  "M230 120 C 260 60 330 80 300 130 C 280 165 240 150 262 118",
  "M330 40 C 380 20 430 50 400 90 C 380 112 345 96 362 70",
  "M470 70 C 520 40 560 90 520 120 C 495 138 470 118 488 98",
  "M205 215 C 250 190 270 240 235 250 C 205 258 200 230 225 226",
  "M520 210 C 560 190 580 235 550 250 C 520 262 505 232 530 226",
  "M300 330 C 330 300 380 330 350 365 C 320 395 270 370 296 345",
  "M430 340 C 470 310 520 345 490 385 C 460 410 410 385 436 358",
  "M215 395 C 250 380 285 410 262 440 C 240 462 205 440 222 418",
  "M505 395 C 540 378 570 410 548 440 C 525 462 492 438 508 418",
  "M380 215 C 395 190 430 205 420 235 C 410 260 372 252 384 228",
];
const JACKET = [
  "M70 640 C 100 590 160 585 190 620 C 215 650 170 665 150 640",
  "M230 540 C 270 505 340 520 320 570 C 305 605 250 595 272 560",
  "M420 520 C 470 495 540 515 520 570 C 505 605 440 600 462 560",
  "M590 560 C 640 540 700 575 670 620 C 650 650 600 640 620 610",
  "M330 620 C 360 600 400 625 380 655 C 360 675 320 655 340 632",
  "M170 560 C 190 545 215 560 205 580",
  "M560 640 C 575 625 600 640 590 658",
];

export default function Figure({ className = "", style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 800 665" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="shell">
          <path d="M195 270 C195 100 280 6 380 6 C480 6 575 100 575 270 L575 385 C575 435 525 462 470 462 L290 462 C240 462 195 435 195 385 Z" />
        </clipPath>
        <clipPath id="jacket">
          <path d="M30 665 C50 560 190 500 300 484 L460 484 C580 500 752 570 780 665 Z" />
        </clipPath>
        <linearGradient id="gloss" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* jacket */}
      <path d="M30 665 C50 560 190 500 300 484 L460 484 C580 500 752 570 780 665 Z" fill="#0e1730" />
      <g clipPath="url(#jacket)" stroke="#8fa3cf" strokeWidth="26" strokeLinecap="round" opacity="0.95">
        {JACKET.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <path d="M380 500 V665" stroke="#6b6a66" strokeWidth="3" />
      <circle cx="380" cy="560" r="9" stroke="#8d8c86" strokeWidth="3" />

      {/* neck */}
      <path d="M296 455 H464 L472 500 C430 520 330 520 288 500 Z" fill="#0e1730" />

      {/* helmet shell */}
      <path d="M195 270 C195 100 280 6 380 6 C480 6 575 100 575 270 L575 385 C575 435 525 462 470 462 L290 462 C240 462 195 435 195 385 Z" fill="#5b8ef5" />
      <g clipPath="url(#shell)" stroke="#101010" strokeWidth="13" strokeLinecap="round">
        {SWIRLS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <rect x="298" y="196" width="164" height="26" rx="6" fill="#101010" opacity="0" />

      {/* stripe above visor */}
      <rect x="248" y="150" width="264" height="30" rx="5" fill="#f1f1ea" />
      {/* visor */}
      <path d="M195 182 H575 V262 C575 280 560 292 538 292 H232 C210 292 195 280 195 262 Z" fill="#0d0d0c" />
      <rect x="350" y="182" width="60" height="110" fill="url(#gloss)" opacity="0.7" />
      <path d="M195 182 H575" stroke="#101010" strokeWidth="14" />

      {/* chin bar badge */}
      <circle cx="380" cy="376" r="30" fill="#f1f1ea" opacity="0.92" />
      <path d="M366 384 L380 360 L394 384 Z" fill="#101010" />
      <path d="M262 318 H300 M460 318 H498" stroke="#101010" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
