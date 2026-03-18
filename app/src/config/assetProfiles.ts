import type { AssetManualProfile } from '../types'

const gripenEProfile: AssetManualProfile = {
  tagline: 'Networked multirole fighter',
  manufacturers: ['Saab'],
  summary:
    'Brazilian Gripen E procurement anchors a software-driven fighter fleet built for air sovereignty, distributed operations and long-horizon industrial transfer.',
  role:
    'Air superiority, quick reaction alert, strike, reconnaissance and networked coalition operations.',
  operatorFit:
    'Well suited to wide-area air policing, fast turnaround cycles and sovereign upgrades through local industrial participation.',
  specs: [
    { label: 'Crew', value: '1 pilot' },
    { label: 'Length', value: '15.2 m' },
    { label: 'Wingspan', value: '8.6 m' },
    { label: 'Max take-off weight', value: '16,500 kg' },
    { label: 'Engine', value: '1 x GE F414G turbofan with 98 kN max thrust' },
    { label: 'Hardpoints', value: '10' },
    { label: 'Air-to-air refuelling', value: 'Yes' },
    { label: 'Combat turnaround', value: '15 to 25 minutes' },
  ],
  missionSystems: [
    'AESA radar and IRST pairing for multi-axis target detection and track continuity.',
    'Advanced electronic warfare suite with spherical coverage for self-protection and battlespace shaping.',
    'Open avionics architecture designed for rapid software updates and national customization.',
  ],
  programNotes: [
    'The Gripen E/F program is structured around Brazilian industrial participation, engineering transfer and local assembly work.',
    'The aircraft is positioned as the future swing-role core of the Brazilian Air Force fighter force.',
  ],
  curiosities: [
    'Saab markets Gripen E as a software-evolving combat system rather than a fixed fighter "generation."',
    'The design emphasizes dispersed basing and high sortie generation instead of large support footprints.',
  ],
  references: [
    {
      label: 'Saab Gripen E series',
      url: 'https://www.saab.com/products/gripen-e-series',
      note: 'Official product page and key facts.',
    },
  ],
}

const blackHawkProfile: AssetManualProfile = {
  tagline: 'Utility lift and mission support helicopter',
  manufacturers: ['Sikorsky'],
  summary:
    'The S-70 Black Hawk layer gives the dashboard a durable medium-lift rotary platform profile for troop transport, SAR, special missions and utility support.',
  role:
    'Air assault, CASEVAC, troop lift, search and rescue, disaster response and general utility aviation.',
  operatorFit:
    'Best used as a flexible workhorse platform where cabin reconfiguration speed matters as much as raw lift performance.',
  specs: [
    { label: 'Crew layout', value: '2 pilots, 2 cabin crew and up to 11 troops' },
    { label: 'Maximum speed', value: '163 kts / 302 km/h' },
    { label: 'Cruise speed', value: '145 kts / 268 km/h' },
    { label: 'Maximum range', value: '268 nm / 496 km' },
    { label: 'Service ceiling', value: '15,000 ft / 4,572 m' },
    { label: 'Maximum ceiling', value: '20,000 ft / 6,097 m' },
    { label: 'Baseline fuel capacity', value: '360 gal / 1,362 L' },
    { label: 'Cabin length', value: '12.58 ft / 3.84 m' },
  ],
  missionSystems: [
    'Multi-mission cabin layout that can pivot between transport, rescue and medevac roles.',
    'Twin-engine combat utility architecture proven across assault, logistics and disaster-relief missions.',
    'Broad configuration space for hoists, auxiliary tanks, external stores and mission kits.',
  ],
  programNotes: [
    'Black Hawk-family aircraft remain a benchmark medium utility platform for armed forces that need lift, survivability and fleet commonality.',
    'For Brazil-facing use cases, the platform profile reinforces rotary-wing reach for mobility, relief and rapid-response operations.',
  ],
  curiosities: [
    'The platform is designed less as a single-role helicopter and more as a mission system with multiple cabin and equipment layouts.',
    'Its endurance and troop-carrying balance make it a recurring choice where armies want one aircraft family for several support missions.',
  ],
  references: [
    {
      label: 'Lockheed Martin S-70 Black Hawk',
      url: 'https://www.lockheedmartin.com/en-us/products/sikorsky-s-70-black-hawk-helicopter.html',
      note: 'Official product page.',
    },
    {
      label: 'S-70 brochure',
      url: 'https://www.lockheedmartin.com/content/dam/lockheed-martin/rms/documents/black-hawk/8365_S-70_Brochure_3.1.19.pdf',
      note: 'Performance and cabin figures used for the spec layer.',
    },
  ],
}

const scorpeneProfile: AssetManualProfile = {
  tagline: 'Conventional attack submarine family',
  manufacturers: ['Naval Group'],
  summary:
    'Brazilian Scorpene procurement is part of a wider PROSUB industrial program, pairing sea-denial capability with deep technology-transfer and local construction goals.',
  role:
    'Anti-surface warfare, anti-submarine warfare, sea denial, intelligence gathering and littoral or open-ocean patrol.',
  operatorFit:
    'Strong fit for long-endurance patrols across the South Atlantic where discretion, local-build knowledge and maintenance sovereignty matter.',
  specs: [
    { label: 'Family baseline length', value: 'About 72 m' },
    { label: 'Surfaced displacement', value: '1,600 to 2,000 tons' },
    { label: 'Submerged speed', value: '> 20 knots' },
    { label: 'Diving depth', value: '> 300 m' },
    { label: 'Mission autonomy', value: '> 78 days on an 80-day mission' },
    { label: 'Submerged autonomy', value: '> 12 days' },
    { label: 'Crew', value: '31 on the Scorpene Evolved baseline' },
    { label: 'Weapons fit', value: '6 tubes with a total payload of 18 weapons' },
  ],
  missionSystems: [
    'SUBTICS combat management system for tactical fusion and weapon employment.',
    'Acoustic discretion and ocean-going endurance for patrols in both shallow and deep waters.',
    'Flexible torpedo, missile and mine load-out architecture around six weapon tubes.',
  ],
  programNotes: [
    'Brazilian boats are locally built through the PROSUB partnership at Itaguai with Naval Group support.',
    'Naval Group describes the Brazilian variant as slightly longer than the original model to support a larger crew plus additional food and fuel.',
  ],
  curiosities: [
    'The Scorpene layer in Brazil is as much an industrial ecosystem project as a submarine acquisition.',
    'Riachuelo entered service on 1 September 2022 as the first Brazilian-built Scorpene submarine.',
  ],
  references: [
    {
      label: 'Naval Group Brazil Scorpene release',
      url: 'https://www.naval-group.com/en/delivery-and-commissioning-riachuelo-first-brazilian-scorpener-submarine-entirely-made-brazil',
      note: 'Brazil-specific industrial context.',
    },
    {
      label: 'Scorpene evolved characteristics',
      url: 'https://www.naval-group.com/en/naval-group-and-pt-pal-have-signed-contract-indonesia-2-locally-built-scorpener-evolved-full-lib',
      note: 'Family baseline performance figures.',
    },
  ],
}

const centauroIiProfile: AssetManualProfile = {
  tagline: 'Mobile gun system for cavalry shock action',
  manufacturers: ['CIO', 'Leonardo', 'IVECO Defence Vehicles'],
  summary:
    'Centauro II adds a fast, digitally networked 8x8 direct-fire platform to the land portfolio, emphasizing mobility, protection and heavy gun deterrence.',
  role:
    'Mobile protected firepower, cavalry reconnaissance-in-force, anti-armour action and rapid reaction support.',
  operatorFit:
    'Useful where road speed, strategic mobility and heavy direct fire need to coexist in a single wheeled platform.',
  specs: [
    { label: 'Layout', value: '8x8 wheeled armoured vehicle' },
    { label: 'Length with 120 mm barrel', value: '8.26 m' },
    { label: 'Gross weight', value: '30 t' },
    { label: 'Engine', value: 'IVECO VECTOR 8V diesel / JP8, 533 kW (720 hp)' },
    { label: 'Top speed', value: '> 105 km/h' },
    { label: 'Road range', value: '> 800 km' },
    { label: 'Primary armament', value: '120 mm /45 main gun' },
    { label: 'Crew arrangement', value: 'Driver plus three-man turret layout' },
  ],
  missionSystems: [
    'Entirely digital architecture with command, control and communication integration.',
    'Latest-generation HITFACT turret with 120 mm gun and stabilized optronics.',
    'Hydro-pneumatic suspension, CTIS and H-drive mobility package for high-speed maneuver.',
  ],
  programNotes: [
    'On 25 November 2022, Leonardo announced that the Brazilian Army selected the Centauro II 120 mm as the top-ranked offer in its VBC Cav - MSR 8x8 process.',
    'The platform is positioned as a deterrent and cavalry modernization asset rather than a tracked main battle tank substitute.',
  ],
  curiosities: [
    'Centauro II combines MBT-class gun lethality with road speed that far exceeds most tracked armour.',
    'Its digital backbone makes it more of a networked fire-support node than a traditional gun car alone.',
  ],
  references: [
    {
      label: 'Centauro II technical sheet',
      url: 'https://www.iveco-otomelara.com/wp-content/uploads/2024/10/Centauro-II.pdf',
      note: 'Primary source for dimensions, mobility and armament.',
    },
    {
      label: 'Leonardo Brazil selection release',
      url: 'https://www.leonardo.com/en/press-release-detail/-/detail/25-11-2022-the-centauro-ii-first-choice-for-the-new-armoured-vehicle-for-the-brazilian-army?refererPlid=1151448',
      note: 'Brazil-specific procurement context.',
    },
  ],
}

const hermes900Profile: AssetManualProfile = {
  tagline: 'Persistent MALE ISR and maritime-watch UAS',
  manufacturers: ['Elbit Systems'],
  summary:
    'Hermes 900 gives the catalog a long-endurance unmanned layer built for persistent intelligence, surveillance and reconnaissance across land borders or maritime approaches.',
  role:
    'Persistent ISTAR, maritime patrol, target acquisition, communications relay and multi-sensor overwatch.',
  operatorFit:
    'Strong fit for large-area surveillance where endurance and payload flexibility matter more than high dash speed.',
  specs: [
    { label: 'Class', value: 'MALE unmanned aerial system' },
    { label: 'Takeoff weight', value: '1,180 kg baseline / 1,600 kg StarLiner variant' },
    { label: 'Max payload', value: '350 kg baseline / 450 kg StarLiner variant' },
    { label: 'Endurance', value: 'Up to 36 hours' },
    { label: 'Service ceiling', value: '30,000 ft' },
    { label: 'Data link', value: 'LOS and SATCOM options' },
    { label: 'Installation bay', value: '250 kg modular installation bay' },
    { label: 'Payload types', value: 'EO/IR, SAR/GMTI, AIS, COMINT, EW and relay packages' },
  ],
  missionSystems: [
    'Persistent multi-payload architecture for border, maritime and overland ISR cycles.',
    'Sensor stack options include EO/IR, SAR/GMTI, AIS, communications intelligence and EW payloads.',
    'Designed for autonomous mission execution with broad sensor and data-link modularity.',
  ],
  programNotes: [
    'The Hermes 900 family is optimized for persistence and payload diversity rather than kinetic strike presentation.',
    'Its profile matches surveillance-heavy missions where a single sortie can cover long-duration watch tasks.',
  ],
  curiosities: [
    'The StarLiner derivative is shaped around airworthiness standards for operation in less segregated airspace.',
    'Hermes 900 is often framed as a sensor truck first and an airframe second.',
  ],
  references: [
    {
      label: 'Hermes 900 brochure',
      url: 'https://www.elbitsystems.com/media/hermes_900_2018-1.pdf',
      note: 'Baseline Hermes 900 performance and payload options.',
    },
    {
      label: 'Hermes 900 StarLiner',
      url: 'https://www.elbitsystems.com/product/hermes-starliner/',
      note: 'Updated StarLiner ceiling, payload and MTOW references.',
    },
  ],
}

const rbs70NgProfile: AssetManualProfile = {
  tagline: 'Short-range laser-guided GBAD shield',
  manufacturers: ['Saab'],
  summary:
    'RBS 70 NG adds a point-defence air layer built around laser-beam-riding guidance, operator aids and fast emplacement for high-value site protection.',
  role:
    'Short-range ground-based air defence for point protection, expeditionary cover and vehicle-mounted or tripod-based deployment.',
  operatorFit:
    'Well matched to airfield defence, mobile force protection and dense electronic-warfare environments where radar-independent engagement matters.',
  specs: [
    { label: 'Effective range', value: '> 9,000 m' },
    { label: 'Altitude coverage', value: '0 to 5,000 m' },
    { label: 'Deployment time', value: '45 seconds' },
    { label: 'Reloading time', value: 'Less than 5 seconds' },
    { label: 'Missile speed', value: 'Bolide missile up to Mach 2' },
    { label: 'Guidance', value: 'Unjammable laser beam-riding' },
    { label: 'Day / night use', value: 'Integrated thermal imager supports both' },
    { label: 'Tracking aid', value: 'Auto-tracker in the NG sight module' },
  ],
  missionSystems: [
    'Laser guidance avoids dependence on onboard missile seekers and complicates electronic countermeasures.',
    'Integrated thermal sight, advanced cueing and auto-tracking improve first-shot engagement quality.',
    'Modular sight can be man-portable, remotely operated or vehicle-integrated.',
  ],
  programNotes: [
    'Saab states the RBS 70 has been in Brazilian Army service since 2014.',
    'The system formed part of the air-defence posture during the Rio 2016 Olympics and Brazilian Army units conducted their first RBS 70 NG firings in 2019.',
  ],
  curiosities: [
    'The same NG sight architecture can be adapted across man-portable and remote weapon station setups.',
    'Its design focus is less about "fire and forget" and more about resilient control through contested conditions.',
  ],
  references: [
    {
      label: 'Saab RBS 70 NG',
      url: 'https://www.saab.com/products/rbs-70-ng',
      note: 'Official capabilities and technical data.',
    },
    {
      label: 'Saab Brazil RBS 70',
      url: 'https://www.saab.com/pt-br/markets/brasil/produtos-e-servicos/Terrestre/rbs70',
      note: 'Brazil-specific service context.',
    },
  ],
}

export const assetManualProfiles: Record<string, AssetManualProfile> = {
  'gripen-e': gripenEProfile,
  's-70l-black-hawk': blackHawkProfile,
  scorpene: scorpeneProfile,
  'centauro-2': centauroIiProfile,
  'hermes-900': hermes900Profile,
  'rbs-70': rbs70NgProfile,
  'rbs-70-mk-3-bolide': rbs70NgProfile,
}
