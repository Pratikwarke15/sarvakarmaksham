import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProblemSeedData {
  name: string;
  hindiName: string;
  description: string;
  estimatedDuration: number; // minutes
  basePrice: number;
  minimumPrice: number;
  maximumPrice: number;
  workerPriceCeiling: number;
  sortOrder: number;
}

interface SubcategorySeedData {
  slug: string;
  name: string;
  hindiName: string;
  icon: string;
  description: string;
  sortOrder: number;
  problems: ProblemSeedData[];
}

interface CategorySeedData {
  slug: string;
  name: string;
  hindiName: string;
  icon: string;
  description: string;
  sortOrder: number;
  subcategories: SubcategorySeedData[];
}

export const CATALOGUE_DATA: CategorySeedData[] = [
  {
    slug: 'plumbing',
    name: 'Plumbing',
    hindiName: 'नल एवं प्लंबिंग',
    icon: 'wrench',
    description: 'Tap repair, toilet leaks, drainage, pipe fittings, and water tanks',
    sortOrder: 1,
    subcategories: [
      {
        slug: 'tap-mixer',
        name: 'Tap & Mixer',
        hindiName: 'नल और मिक्सर',
        icon: 'droplets',
        description: 'Repairs and installations for washroom, kitchen taps, and mixer faucets',
        sortOrder: 1,
        problems: [
          {
            name: 'Tap Repair (Leakage / Dripping)',
            hindiName: 'नल की मरम्मत (टपकना / लीकेज)',
            description: 'Fix dripping or leaking tap washers, spindles, and loose valves',
            estimatedDuration: 30,
            basePrice: 149,
            minimumPrice: 119,
            maximumPrice: 249,
            workerPriceCeiling: 299,
            sortOrder: 1,
          },
          {
            name: 'Tap Replacement / Installation',
            hindiName: 'नया नल लगाना / बदलना',
            description: 'Install or replace wall tap, pillar tap, or bib cock (parts excluded)',
            estimatedDuration: 45,
            basePrice: 199,
            minimumPrice: 149,
            maximumPrice: 299,
            workerPriceCeiling: 349,
            sortOrder: 2,
          },
          {
            name: 'Mixer Tap Repair / Cartridge Replacement',
            hindiName: 'मिक्सर नल रिपेयर / कार्ट्रिज बदलना',
            description: 'Repair single lever hot/cold mixer faucet or replace ceramic cartridge',
            estimatedDuration: 45,
            basePrice: 299,
            minimumPrice: 249,
            maximumPrice: 449,
            workerPriceCeiling: 499,
            sortOrder: 3,
          },
          {
            name: 'Water Nozzle / Aerator Descaling & Cleaning',
            hindiName: 'नल की धार ठीक करना / सफाई',
            description: 'Clean clogged aerators and low water pressure nozzles',
            estimatedDuration: 30,
            basePrice: 129,
            minimumPrice: 99,
            maximumPrice: 199,
            workerPriceCeiling: 249,
            sortOrder: 4,
          },
        ],
      },
      {
        slug: 'toilet-sanitary',
        name: 'Toilet & Sanitary',
        hindiName: 'टॉयलेट और सेनेटरी',
        icon: 'bath',
        description: 'Flush tanks, jet sprays, commode blockages, and sanitaryware fitting',
        sortOrder: 2,
        problems: [
          {
            name: 'Flush Tank / Cistern Leakage Repair',
            hindiName: 'फ्लश टैंक रिपेयर / पानी बहना',
            description: 'Fix continuously running water, siphon kit, or flush button issues',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 399,
            workerPriceCeiling: 449,
            sortOrder: 1,
          },
          {
            name: 'Jet Spray Repair & Installation',
            hindiName: 'जेट स्प्रे फिटिंग व मरम्मत',
            description: 'Fix or replace hand jet spray, flexi tube, or angle valve',
            estimatedDuration: 30,
            basePrice: 149,
            minimumPrice: 119,
            maximumPrice: 249,
            workerPriceCeiling: 299,
            sortOrder: 2,
          },
          {
            name: 'Toilet Pot Blockage Removal',
            hindiName: 'टॉयलेट पॉट जाम खोलना',
            description: 'Heavy blockage clearance in western or Indian WC with plumbing spiral snake',
            estimatedDuration: 60,
            basePrice: 399,
            minimumPrice: 349,
            maximumPrice: 599,
            workerPriceCeiling: 699,
            sortOrder: 3,
          },
          {
            name: 'Toilet Seat Cover Replacement',
            hindiName: 'टॉयलेट सीट कवर बदलना',
            description: 'Remove broken commode lid and install new soft-close or standard seat',
            estimatedDuration: 30,
            basePrice: 149,
            minimumPrice: 119,
            maximumPrice: 249,
            workerPriceCeiling: 299,
            sortOrder: 4,
          },
        ],
      },
      {
        slug: 'basin-sink',
        name: 'Basin & Sink',
        hindiName: 'बेसिन और सिंक',
        icon: 'waves',
        description: 'Kitchen sink plumbing, wash basin leakages, bottle trap, and drains',
        sortOrder: 3,
        problems: [
          {
            name: 'Kitchen Sink Drain Pipe Leakage',
            hindiName: 'किचन सिंक पाइप लीकेज ठीक करना',
            description: 'Fix or replace flexible waste pipe and seal joint below sink',
            estimatedDuration: 40,
            basePrice: 199,
            minimumPrice: 149,
            maximumPrice: 299,
            workerPriceCeiling: 349,
            sortOrder: 1,
          },
          {
            name: 'Wash Basin Blockage Removal',
            hindiName: 'वॉश बेसिन जाम खोलना',
            description: 'Clear grease, hair, and soap accumulation in wash basin drain',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 399,
            workerPriceCeiling: 449,
            sortOrder: 2,
          },
          {
            name: 'Wash Basin Installation',
            hindiName: 'नया वॉश बेसिन लगाना',
            description: 'Mount ceramic basin, bracket fixing, and connection to waste pipe',
            estimatedDuration: 90,
            basePrice: 499,
            minimumPrice: 449,
            maximumPrice: 799,
            workerPriceCeiling: 899,
            sortOrder: 3,
          },
          {
            name: 'Bottle Trap Replacement',
            hindiName: 'बॉटल ट्रैप बदलना',
            description: 'Replace cracked or leaking PVC / brass bottle trap under basin',
            estimatedDuration: 40,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 349,
            workerPriceCeiling: 399,
            sortOrder: 4,
          },
        ],
      },
      {
        slug: 'drainage-tank',
        name: 'Drainage & Water Tank',
        hindiName: 'ड्रेनेज और पानी की टंकी',
        icon: 'cylinder',
        description: 'Floor traps, balcony drainage blockages, and overhead tank valves',
        sortOrder: 4,
        problems: [
          {
            name: 'Bathroom / Balcony Floor Drain Blockage',
            hindiName: 'बाथरूम या बालकनी नाली जाम खोलना',
            description: 'Unclog choked floor nahani trap or main outlet pipe',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 549,
            workerPriceCeiling: 599,
            sortOrder: 1,
          },
          {
            name: 'Water Tank Overflow & Float Valve Repair',
            hindiName: 'पानी टंकी ओवरफ्लो / फ्लोट वॉल्व बदलना',
            description: 'Replace malfunctioning ball cock or automatic float switch valve',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 399,
            workerPriceCeiling: 449,
            sortOrder: 2,
          },
          {
            name: 'Drain Jali / Cockroach Trap Installation',
            hindiName: 'ड्रेन जाली / कॉकरोच ट्रैप लगाना',
            description: 'Fix stainless steel anti-foul floor drain cover with cement seal',
            estimatedDuration: 30,
            basePrice: 149,
            minimumPrice: 119,
            maximumPrice: 249,
            workerPriceCeiling: 299,
            sortOrder: 3,
          },
        ],
      },
    ],
  },
  {
    slug: 'electrical',
    name: 'Electrical',
    hindiName: 'इलेक्ट्रिकल एवं वायरिंग',
    icon: 'zap',
    description: 'Switchboards, fans, lights, MCB tripping, and wiring troubleshooting',
    sortOrder: 2,
    subcategories: [
      {
        slug: 'switch-socket',
        name: 'Switch & Socket',
        hindiName: 'स्विच और सॉकेट',
        icon: 'power',
        description: 'Replacement and wiring for residential switches, power sockets, and boards',
        sortOrder: 1,
        problems: [
          {
            name: 'Switch or Socket Replacement (Up to 2)',
            hindiName: 'स्विच या सॉकेट बदलना',
            description: 'Diagnose and replace malfunctioning switches, 5A sockets, or indicators',
            estimatedDuration: 30,
            basePrice: 129,
            minimumPrice: 99,
            maximumPrice: 199,
            workerPriceCeiling: 249,
            sortOrder: 1,
          },
          {
            name: '16A / 25A Heavy Appliance Power Point Installation',
            hindiName: 'गीजर / एसी पावर सॉकेट फिटिंग',
            description: 'Install heavy-duty socket point with earthing for geyser, microwave, or AC',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 349,
            workerPriceCeiling: 399,
            sortOrder: 2,
          },
          {
            name: 'Modular Switchboard Installation / Replacement',
            hindiName: 'मॉड्यूलर स्विचबोर्ड फिटिंग',
            description: 'Replace complete 6/8/12 module face plate with internal rewiring',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 549,
            sortOrder: 3,
          },
          {
            name: 'Loose Connection & Sparking Fix',
            hindiName: 'लूज़ कनेक्शन व स्पार्किंग ठीक करना',
            description: 'Locate sparking points, tighten terminals, and replace burnt wire ends',
            estimatedDuration: 30,
            basePrice: 179,
            minimumPrice: 149,
            maximumPrice: 249,
            workerPriceCeiling: 299,
            sortOrder: 4,
          },
        ],
      },
      {
        slug: 'fan',
        name: 'Fan Repair & Installation',
        hindiName: 'पंखे की मरम्मत व फिटिंग',
        icon: 'fan',
        description: 'Ceiling fans, exhaust fans, capacitor changes, and wall fans',
        sortOrder: 2,
        problems: [
          {
            name: 'Ceiling Fan Installation',
            hindiName: 'छत का पंखा लगाना',
            description: 'Assemble downrod, canopy, blades, and hook onto ceiling anchor securely',
            estimatedDuration: 45,
            basePrice: 199,
            minimumPrice: 159,
            maximumPrice: 299,
            workerPriceCeiling: 349,
            sortOrder: 1,
          },
          {
            name: 'Ceiling Fan Speed / Capacitor Repair',
            hindiName: 'पंखे की स्पीड / कैपेसिटर रिपेयर',
            description: 'Diagnose slow speed, replace 2.5 mfd capacitor, or lubricate shaft',
            estimatedDuration: 30,
            basePrice: 149,
            minimumPrice: 119,
            maximumPrice: 249,
            workerPriceCeiling: 299,
            sortOrder: 2,
          },
          {
            name: 'Exhaust Fan Installation / Replacement',
            hindiName: 'एग्जॉस्ट फैन लगाना या बदलना',
            description: 'Kitchen or bathroom wall/glass exhaust fan mounting and connection',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 349,
            workerPriceCeiling: 399,
            sortOrder: 3,
          },
          {
            name: 'Fan Regulator Replacement',
            hindiName: 'फैन रेगुलेटर बदलना',
            description: 'Replace step-type or rotary electronic speed controller',
            estimatedDuration: 30,
            basePrice: 129,
            minimumPrice: 99,
            maximumPrice: 199,
            workerPriceCeiling: 249,
            sortOrder: 4,
          },
        ],
      },
      {
        slug: 'lights-wiring',
        name: 'Lights & Wiring',
        hindiName: 'लाइटिंग और वायरिंग',
        icon: 'lightbulb',
        description: 'LED lights, chandeliers, short circuit diagnosis, and inverter connections',
        sortOrder: 3,
        problems: [
          {
            name: 'LED Batten / Tube Light Installation',
            hindiName: 'एलईडी ट्यूबलाइट फिटिंग',
            description: 'Wall drill, anchor fixing, and wiring for LED strip batten',
            estimatedDuration: 30,
            basePrice: 129,
            minimumPrice: 99,
            maximumPrice: 199,
            workerPriceCeiling: 249,
            sortOrder: 1,
          },
          {
            name: 'Chandelier / Decorative Pendant Light Hanging',
            hindiName: 'झूमर / फैंसी लाइट लगाना',
            description: 'Heavy anchor fixing, weight balancing, and connection for decorative light',
            estimatedDuration: 75,
            basePrice: 499,
            minimumPrice: 399,
            maximumPrice: 799,
            workerPriceCeiling: 899,
            sortOrder: 2,
          },
          {
            name: 'Short Circuit & Fault Finding',
            hindiName: 'शॉर्ट सर्किट और फॉल्ट ठीक करना',
            description: 'Multimeter inspection of line-to-neutral or earthing fault in home wiring',
            estimatedDuration: 90,
            basePrice: 499,
            minimumPrice: 399,
            maximumPrice: 799,
            workerPriceCeiling: 899,
            sortOrder: 3,
          },
          {
            name: 'Inverter Wiring & Connection',
            hindiName: 'इन्वर्टर कनेक्शन व वायरिंग',
            description: 'Connect home inverter battery setup and configure essential load circuits',
            estimatedDuration: 60,
            basePrice: 399,
            minimumPrice: 349,
            maximumPrice: 599,
            workerPriceCeiling: 699,
            sortOrder: 4,
          },
        ],
      },
      {
        slug: 'mcb-fuse',
        name: 'MCB & Distribution Board',
        hindiName: 'एमसीबी और फ़्यूज़',
        icon: 'shield-alert',
        description: 'Tripping miniature circuit breakers, isolators, and distribution box repair',
        sortOrder: 4,
        problems: [
          {
            name: 'MCB Tripping Issue Diagnosis & Fix',
            hindiName: 'बार-बार ट्रिप होने वाली एमसीबी ठीक करना',
            description: 'Locate overload or earth leakage causing MCB to trip repeatedly',
            estimatedDuration: 45,
            basePrice: 299,
            minimumPrice: 249,
            maximumPrice: 449,
            workerPriceCeiling: 499,
            sortOrder: 1,
          },
          {
            name: 'Single / Double Pole MCB Replacement',
            hindiName: 'एमसीबी बदलना',
            description: 'Replace faulty or burnt MCB in the main electrical distribution box',
            estimatedDuration: 30,
            basePrice: 199,
            minimumPrice: 149,
            maximumPrice: 299,
            workerPriceCeiling: 349,
            sortOrder: 2,
          },
        ],
      },
    ],
  },
  {
    slug: 'carpentry',
    name: 'Carpentry',
    hindiName: 'बढ़ई एवं लकड़ी का काम',
    icon: 'hammer',
    description: 'Door repairs, locks, hinges, sliding wardrobes, furniture, and wall mounting',
    sortOrder: 3,
    subcategories: [
      {
        slug: 'door-lock',
        name: 'Door & Lock',
        hindiName: 'दरवाजा और लॉक',
        icon: 'door-closed',
        description: 'Lock installations, door alignment, handles, hinges, and latches',
        sortOrder: 1,
        problems: [
          {
            name: 'Door Lock / Handle Installation',
            hindiName: 'दरवाजे का ताला व हैंडल लगाना',
            description: 'Chisel wood, install mortise lock or cylindrical door knob',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 399,
            workerPriceCeiling: 449,
            sortOrder: 1,
          },
          {
            name: 'Main Door Deadbolt / Godrej Lock Repair',
            hindiName: 'मुख्य दरवाजे का लॉक रिपेयर',
            description: 'Fix stuck cylinder, key jam, or loose faceplate on safety rim lock',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 549,
            sortOrder: 2,
          },
          {
            name: 'Door Floor Scraping / Alignment Fix',
            hindiName: 'दरवाजा फर्श पर रगड़ना ठीक करना',
            description: 'Plane swollen wooden door bottom and re-align hinges to prevent rubbing',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 349,
            workerPriceCeiling: 399,
            sortOrder: 3,
          },
          {
            name: 'Door Stopper / Eye-hole Fitting',
            hindiName: 'डोर स्टॉपर या आई-होल लगाना',
            description: 'Fit magnetic floor/wall stopper, security chain, or peephole viewer',
            estimatedDuration: 30,
            basePrice: 149,
            minimumPrice: 119,
            maximumPrice: 229,
            workerPriceCeiling: 269,
            sortOrder: 4,
          },
        ],
      },
      {
        slug: 'cupboard-drawer',
        name: 'Cupboard & Drawer',
        hindiName: 'अलमारी और दराज',
        icon: 'archive',
        description: 'Auto-hinges, drawer telescopic channels, sliders, and shelf repairs',
        sortOrder: 2,
        problems: [
          {
            name: 'Wardrobe Auto-Hinge Replacement (Pair)',
            hindiName: 'अलमारी का कब्ज़ा बदलना',
            description: 'Replace worn-out soft close concealed hinge and adjust door gap',
            estimatedDuration: 40,
            basePrice: 199,
            minimumPrice: 149,
            maximumPrice: 299,
            workerPriceCeiling: 349,
            sortOrder: 1,
          },
          {
            name: 'Drawer Telescopic Channel Repair / Replacement',
            hindiName: 'दराज की चैनल रिपेयर',
            description: 'Replace jammed ball-bearing slider channel for kitchen/study drawers',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 349,
            workerPriceCeiling: 399,
            sortOrder: 2,
          },
          {
            name: 'Wardrobe Sliding Door Roller Adjustment',
            hindiName: 'स्लाइडिंग वार्डरोब रोलर ठीक करना',
            description: 'Align derailed sliding door and replace heavy-duty bottom wheels',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 549,
            sortOrder: 3,
          },
        ],
      },
      {
        slug: 'furniture-repair',
        name: 'Furniture Repair',
        hindiName: 'फर्नीचर मरम्मत',
        icon: 'armchair',
        description: 'Bed frame joints, dining table legs, chair wobbles, and minor fixes',
        sortOrder: 3,
        problems: [
          {
            name: 'Bed Frame & Hydraulic / Slat Repair',
            hindiName: 'पलंग या हाइड्रोलिक लिफ्ट रिपेयर',
            description: 'Reinforce cracked bed plywood support or adjust hydraulic lift pump',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 599,
            sortOrder: 1,
          },
          {
            name: 'Dining / Study Chair & Table Joint Tightening',
            hindiName: 'कुर्सी या मेज के ढीले जोड़ कसना',
            description: 'Disassemble wobbly joints, re-glue with adhesive, and tighten bracket screws',
            estimatedDuration: 40,
            basePrice: 199,
            minimumPrice: 149,
            maximumPrice: 299,
            workerPriceCeiling: 349,
            sortOrder: 2,
          },
        ],
      },
      {
        slug: 'drill-hang',
        name: 'Drill & Hang',
        hindiName: 'ड्रिल और हैंगिंग',
        icon: 'tool',
        description: 'Curtain rod fittings, TV brackets, mirrors, and bathroom shelves',
        sortOrder: 4,
        problems: [
          {
            name: 'Curtain Rod / Blind Installation',
            hindiName: 'पर्दे की रॉड लगाना',
            description: 'Drill masonry, insert rawl plugs, and mount bracket supports (per rod)',
            estimatedDuration: 45,
            basePrice: 199,
            minimumPrice: 149,
            maximumPrice: 299,
            workerPriceCeiling: 349,
            sortOrder: 1,
          },
          {
            name: 'TV Wall Mount Installation (Up to 55 inch)',
            hindiName: 'टीवी वॉल माउंटिंग',
            description: 'Solid wall anchor drilling, bracket level alignment, and TV hanging',
            estimatedDuration: 60,
            basePrice: 399,
            minimumPrice: 349,
            maximumPrice: 599,
            workerPriceCeiling: 699,
            sortOrder: 2,
          },
          {
            name: 'Mirror / Wall Art / Clock Hanging (Up to 3 items)',
            hindiName: 'आईना या फोटो फ्रेम टांगना',
            description: 'Precision drill holes with level check for mirrors and frames',
            estimatedDuration: 30,
            basePrice: 149,
            minimumPrice: 119,
            maximumPrice: 249,
            workerPriceCeiling: 299,
            sortOrder: 3,
          },
        ],
      },
    ],
  },
  {
    slug: 'appliance-repair',
    name: 'Appliance Repair',
    hindiName: 'घरेलू उपकरण मरम्मत',
    icon: 'tv',
    description: 'Air conditioners, washing machines, refrigerators, water purifiers, and geysers',
    sortOrder: 4,
    subcategories: [
      {
        slug: 'air-conditioner',
        name: 'Air Conditioner (AC)',
        hindiName: 'एसी सर्विस एवं रिपेयर',
        icon: 'wind',
        description: 'AC foam cleaning, water leakage, cooling check, and uninstallation',
        sortOrder: 1,
        problems: [
          {
            name: 'Split AC Deep Jet Foam Cleaning',
            hindiName: 'स्प्लिट एसी डीप फोम सर्विस',
            description: 'Pressure wash cooling coil, blower, drain tray, and outdoor unit with foam',
            estimatedDuration: 60,
            basePrice: 499,
            minimumPrice: 449,
            maximumPrice: 699,
            workerPriceCeiling: 799,
            sortOrder: 1,
          },
          {
            name: 'AC Water Leakage Troubleshooting',
            hindiName: 'एसी से पानी टपकना ठीक करना',
            description: 'Clear clogged condensation drain pipe and adjust indoor unit level',
            estimatedDuration: 45,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 549,
            sortOrder: 2,
          },
          {
            name: 'AC Cooling Check & Diagnosis',
            hindiName: 'कूलिंग न करना / गैस जांच',
            description: 'Comprehensive inspection of compressor, gas pressure, and PCB circuit',
            estimatedDuration: 45,
            basePrice: 299,
            minimumPrice: 249,
            maximumPrice: 449,
            workerPriceCeiling: 499,
            sortOrder: 3,
          },
          {
            name: 'AC Uninstallation',
            hindiName: 'एसी खोलना / निकालना',
            description: 'Pump down refrigerant gas into compressor and safely remove indoor & outdoor units',
            estimatedDuration: 60,
            basePrice: 499,
            minimumPrice: 449,
            maximumPrice: 699,
            workerPriceCeiling: 799,
            sortOrder: 4,
          },
        ],
      },
      {
        slug: 'washing-machine',
        name: 'Washing Machine',
        hindiName: 'वॉशिंग मशीन',
        icon: 'disc',
        description: 'Top load & front load drainage, spin cycle issues, vibration, and checks',
        sortOrder: 2,
        problems: [
          {
            name: 'Water Drainage / Inflow Problem',
            hindiName: 'पानी न निकलना या न भरना',
            description: 'Inspect drain pump, inlet solenoid valve filter, and water level sensor',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 549,
            sortOrder: 1,
          },
          {
            name: 'Drum Not Spinning / Loud Vibration',
            hindiName: 'ड्रम न घूमना / तेज आवाज',
            description: 'Diagnose motor belt slip, drum suspension shock absorbers, or bearing wear',
            estimatedDuration: 60,
            basePrice: 399,
            minimumPrice: 349,
            maximumPrice: 599,
            workerPriceCeiling: 699,
            sortOrder: 2,
          },
          {
            name: 'General Checkup & Service',
            hindiName: 'वॉशिंग मशीन जनरल सर्विस',
            description: 'Descale drum, clean lint filters, inspect inlet hoses, and test cycles',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 549,
            sortOrder: 3,
          },
        ],
      },
      {
        slug: 'refrigerator',
        name: 'Refrigerator',
        hindiName: 'फ्रिज',
        icon: 'snowflake',
        description: 'Single and double door cooling issues, door gasket seals, and leaks',
        sortOrder: 3,
        problems: [
          {
            name: 'Not Cooling / Low Cooling Diagnosis',
            hindiName: 'फ्रिज ठंडा न होना',
            description: 'Inspect thermostat, defrost timer, relay, capillary tube, and compressor',
            estimatedDuration: 45,
            basePrice: 299,
            minimumPrice: 249,
            maximumPrice: 449,
            workerPriceCeiling: 499,
            sortOrder: 1,
          },
          {
            name: 'Door Rubber Gasket Replacement',
            hindiName: 'फ्रिज का रबर सील बदलना',
            description: 'Fit new magnetic door seal to stop cool air leakage (seal cost separate)',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 349,
            workerPriceCeiling: 399,
            sortOrder: 2,
          },
        ],
      },
      {
        slug: 'water-purifier-ro',
        name: 'Water Purifier (RO)',
        hindiName: 'वॉटर प्यूरीफायर / आरओ',
        icon: 'filter',
        description: 'Slow water flow, membrane replacement, leakages, and TDS adjustment',
        sortOrder: 4,
        problems: [
          {
            name: 'Slow Water Output / No Water Flow',
            hindiName: 'पानी का बहाव कम होना',
            description: 'Inspect booster pump pressure, sediment filter choking, and auto cut-off',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 349,
            workerPriceCeiling: 399,
            sortOrder: 1,
          },
          {
            name: 'Filter & RO Membrane Replacement Service',
            hindiName: 'आरओ फिल्टर बदलना',
            description: 'Flush system, replace carbon/sediment candle and RO membrane',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 549,
            sortOrder: 2,
          },
          {
            name: 'Purifier Water Leakage Repair',
            hindiName: 'प्यूरीफायर से पानी टपकना',
            description: 'Replace leaky 1/4" elbow connectors, pipe fittings, or float valve',
            estimatedDuration: 45,
            basePrice: 249,
            minimumPrice: 199,
            maximumPrice: 349,
            workerPriceCeiling: 399,
            sortOrder: 3,
          },
        ],
      },
      {
        slug: 'geyser',
        name: 'Geyser / Water Heater',
        hindiName: 'गीज़र',
        icon: 'flame',
        description: 'Heating element issues, thermostat tripping, leakages, and installations',
        sortOrder: 5,
        problems: [
          {
            name: 'Geyser Not Heating / Slow Heating',
            hindiName: 'गीजर पानी गर्म न करना',
            description: 'Diagnose faulty heating element, thermostat cutout, or power cord',
            estimatedDuration: 45,
            basePrice: 299,
            minimumPrice: 249,
            maximumPrice: 449,
            workerPriceCeiling: 499,
            sortOrder: 1,
          },
          {
            name: 'Geyser Heating Element / Thermostat Replacement',
            hindiName: 'थर्मोस्टेट या एलिमेंट बदलना',
            description: 'Drain tank, remove scaled element, and install new copper element & gasket',
            estimatedDuration: 60,
            basePrice: 349,
            minimumPrice: 299,
            maximumPrice: 499,
            workerPriceCeiling: 549,
            sortOrder: 2,
          },
          {
            name: 'New Geyser Installation',
            hindiName: 'नया गीजर लगाना',
            description: 'Drill wall, mount 10L-25L storage or instant water heater, connect inlet/outlet pipes',
            estimatedDuration: 60,
            basePrice: 449,
            minimumPrice: 399,
            maximumPrice: 649,
            workerPriceCeiling: 699,
            sortOrder: 3,
          },
        ],
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Indian Service Catalogue...');

  for (const catData of CATALOGUE_DATA) {
    const category = await prisma.serviceCategory.upsert({
      where: { slug: catData.slug },
      update: {
        name: catData.name,
        hindiName: catData.hindiName,
        icon: catData.icon,
        description: catData.description,
        sortOrder: catData.sortOrder,
        active: true,
      },
      create: {
        slug: catData.slug,
        name: catData.name,
        hindiName: catData.hindiName,
        icon: catData.icon,
        description: catData.description,
        sortOrder: catData.sortOrder,
        active: true,
      },
    });

    console.log(`  Category [${category.name}] upserted`);

    for (const subData of catData.subcategories) {
      const subcategory = await prisma.serviceSubCategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug: subData.slug,
          },
        },
        update: {
          name: subData.name,
          hindiName: subData.hindiName,
          icon: subData.icon,
          description: subData.description,
          sortOrder: subData.sortOrder,
          active: true,
        },
        create: {
          categoryId: category.id,
          slug: subData.slug,
          name: subData.name,
          hindiName: subData.hindiName,
          icon: subData.icon,
          description: subData.description,
          sortOrder: subData.sortOrder,
          active: true,
        },
      });

      console.log(`    SubCategory [${subcategory.name}] upserted`);

      function getPricingUnit(name: string): string {
        const n = name.toLowerCase();
        if (n.includes('tap') || n.includes('mixer') || n.includes('faucet')) return 'per_tap';
        if (n.includes('tank')) return 'per_tank';
        if (n.includes('toilet') || n.includes('commode') || n.includes('cistern') || n.includes('jet spray')) return 'per_unit';
        if (n.includes('fan')) return 'per_fan';
        if (n.includes('switch') || n.includes('socket') || n.includes('board') || n.includes('light') || n.includes('mcb')) return 'per_point';
        if (n.includes('lock') || n.includes('door') || n.includes('drawer') || n.includes('hinge')) return 'per_fixture';
        if (n.includes('ac') || n.includes('geyser') || n.includes('ro') || n.includes('machine') || n.includes('appliance')) return 'per_appliance';
        return 'per_job';
      }

      for (const probData of subData.problems) {
        const pricingUnit = getPricingUnit(probData.name);
        const labourCostMin = Math.round(probData.minimumPrice * 0.8);
        const labourCostMax = Math.round(probData.maximumPrice * 0.8);
        const inspectionFee = 99;
        const platformFeeRate = 5.0;
        const materialCostMin = 0;
        const materialCostMax = Math.round(probData.maximumPrice * 0.25);
        const materialNote = "Additional material cost may apply after inspection.";
        const benchmarkSource = "CPWD DSR 2023 & Indian Urban Gig Benchmarks";

        // Find existing or create
        const existingProb = await prisma.serviceProblem.findFirst({
          where: {
            categoryId: category.id,
            subcategoryId: subcategory.id,
            name: probData.name,
          },
        });

        let savedProblemId = "";
        if (existingProb) {
          const updated = await prisma.serviceProblem.update({
            where: { id: existingProb.id },
            data: {
              hindiName: probData.hindiName,
              description: probData.description,
              estimatedDuration: probData.estimatedDuration,
              basePrice: probData.basePrice,
              minimumPrice: probData.minimumPrice,
              maximumPrice: probData.maximumPrice,
              workerPriceCeiling: probData.workerPriceCeiling,
              pricingUnit,
              labourCostMin,
              labourCostMax,
              inspectionFee,
              platformFeeRate,
              materialCostMin,
              materialCostMax,
              materialNote,
              benchmarkSource,
              sortOrder: probData.sortOrder,
              active: true,
            },
          });
          savedProblemId = updated.id;
        } else {
          const created = await prisma.serviceProblem.create({
            data: {
              categoryId: category.id,
              subcategoryId: subcategory.id,
              name: probData.name,
              hindiName: probData.hindiName,
              description: probData.description,
              estimatedDuration: probData.estimatedDuration,
              basePrice: probData.basePrice,
              minimumPrice: probData.minimumPrice,
              maximumPrice: probData.maximumPrice,
              workerPriceCeiling: probData.workerPriceCeiling,
              pricingUnit,
              labourCostMin,
              labourCostMax,
              inspectionFee,
              platformFeeRate,
              materialCostMin,
              materialCostMax,
              materialNote,
              benchmarkSource,
              sortOrder: probData.sortOrder,
              active: true,
            },
          });
          savedProblemId = created.id;
        }

        // Upsert default ProblemPricingConfig (extensible tier/city pricing architecture)
        await prisma.problemPricingConfig.upsert({
          where: {
            problemId_city_skillLevel: {
              problemId: savedProblemId,
              city: "NATIONAL_DEFAULT",
              skillLevel: "STANDARD",
            },
          },
          update: {
            basePrice: probData.basePrice,
            minimumPrice: probData.minimumPrice,
            maximumPrice: probData.maximumPrice,
            workerPriceCeiling: probData.workerPriceCeiling,
            labourCostMin,
            labourCostMax,
            inspectionFee,
            platformFeeRate,
            materialNote,
            benchmarkSource,
            isActive: true,
          },
          create: {
            problemId: savedProblemId,
            city: "NATIONAL_DEFAULT",
            skillLevel: "STANDARD",
            basePrice: probData.basePrice,
            minimumPrice: probData.minimumPrice,
            maximumPrice: probData.maximumPrice,
            workerPriceCeiling: probData.workerPriceCeiling,
            labourCostMin,
            labourCostMax,
            inspectionFee,
            platformFeeRate,
            materialNote,
            benchmarkSource,
            isActive: true,
          },
        });
      }
    }
  }

  const categoryCount = await prisma.serviceCategory.count();
  const subcategoryCount = await prisma.serviceSubCategory.count();
  const problemCount = await prisma.serviceProblem.count();

  console.log(`Catalog seeded successfully! Total: ${categoryCount} categories, ${subcategoryCount} subcategories, ${problemCount} specific problems.`);
}

seed()
  .catch((e) => {
    console.error('Seed catalog error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
