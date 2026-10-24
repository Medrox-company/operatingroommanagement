/**
 * Úplný veřejný adresář detailů mapy KNL Liberec, snímek z 24. 10. 2026.
 *
 * Převzata jsou všechna podlaží a všechny položky serverových building-detail
 * dialogů, včetně prázdných podlaží a opakovaných názvů; nebyly odhadovány další
 * místnosti. HTML značky jsou odstraněné, mezery a entity normalizované.
 * PARKING a UZAVERA jsou informační odkazy, nikoli fyzická podlaží.
 * Jde o adresář, nikoli o inventář lůžek, sálů nebo jejich skutečné rozmístění.
 * Neurčuje aktuální provoz, personál, pacienty ani průchodnost.
 */
export interface CampusFloor {
  label: string;
  departments: string[];
}

export interface CampusDirectoryEntry {
  id: string;
  name: string;
  sourceUrl: string;
  floors?: CampusFloor[];
  information?: { label: string; title: string; url: string }[];
}

export const CAMPUS_DIRECTORY_SOURCE = {
  title: 'Krajská nemocnice Liberec — podlaží a pracoviště v detailech veřejné mapy',
  url: 'https://www.nemlib.cz/mapa/',
  interactionScriptUrl: 'https://www.nemlib.cz/assets/themes/nemlib/js/map.js?ver=5',
  retrievedAt: '2026-10-24',
  scope: 'Všech 25 detailů veřejné mapy: 23 budov a objektů s 82 podlažími a 325 položkami pracovišť; 2 samostatné informační odkazy.',
  limitations: 'Statický snímek veřejného adresáře, nikoli úplný registr nemocnice ani živý provoz. Zdroj neuvádí počty nebo skutečné rozmístění lůžek a operačních sálů.',
  modeledScope: '21 budov s obrysem má 76 zveřejněných podlaží a 319 položek pracovišť. Parkovací dům odkazuje na informace o parkování, bez zveřejněného členění po podlažích.',
} as const;

/** Výslovné mapování kliknutí na PD v oficiálním map.js; nejde o podlaží PD. */
export const CAMPUS_DIRECTORY_ALIASES: Readonly<Record<string, string>> = { PD: 'PARKING' };

export const CAMPUS_DIRECTORY: CampusDirectoryEntry[] = [
  {
    "id": "A",
    "name": "Pavilon chirurgických oborů",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-a",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Poradna pro léčbu chronické rány",
          "Urgentní chirurgicko-traumatologický příjem 24/7, recepce třídění",
          "Sterilizace Liberec",
          "Radiodiagnostika CT spirální",
          "Úrazová ambulance",
          "Poradna cévní chirurgie - Hemodialyzační vstupy",
          "Poradna chirurgická - Hrudní",
          "Sterilizační centrum Liberec",
          "Poradna pro AV zkraty",
          "Poradna žilní chirurgie",
          "Poradna pro léčbu chronické rány",
          "Poradna mammologická",
          "Poradna pro hepato-pankreato-biliární chirurgii",
          "Poradna chirurgická - gastroenterologická a kýlní",
          "Poradna dětské chirurgie",
          "Poradna cévní chirurgie",
          "Ambulance chirurgie",
          "Ambulance chirurgie – akutní",
          "Urologická ambulance",
          "Urologická pohotovost",
          "Poradna traumatologie č.1",
          "Poradna pro poranění páteře a pánve",
          "Poradna chirurgie ruky",
          "Poradna proktologická",
          "Kýlní centrum"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Centrální operační sály - vstup pro ambulantní pacienty",
          "Radiodiagnostika - skiagrafie",
          "Onkochirurgie"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "JIP chirurgických oborů"
        ]
      },
      {
        "label": "3. podlaží",
        "departments": [
          "Generální ředitel",
          "Traumatologie",
          "Traumatologicko-ortopedické centrum",
          "Centrální operační sály"
        ]
      },
      {
        "label": "4. podlaží",
        "departments": [
          "Urologie",
          "Cévní chirurgie"
        ]
      },
      {
        "label": "5. podlaží",
        "departments": [
          "Všeobecná chirurgie - lůžkové oddělení"
        ]
      }
    ]
  },
  {
    "id": "B",
    "name": "Pavilon interních oborů",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-b",
    "floors": [
      {
        "label": "Podlaží S2",
        "departments": [
          "Centrum zobrazovacích metod",
          "Počítačová tomografie - CT",
          "Magnetická rezonance (MRI)"
        ]
      },
      {
        "label": "Podlaží S1",
        "departments": [
          "Bazén (vodoléčba), elektroléčba, tělocvičny, ergoterapie",
          "Ambulance rehabilitace",
          "Rehabilitace"
        ]
      },
      {
        "label": "Přízemí",
        "departments": [
          "Urgentní interní příjem dospělých 24/7, recepce třídění",
          "ARO - CARIM",
          "Angiografie (AG), Skiaskopie, archiv",
          "Duplexní sonografie tepen a žil dolních končetin"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Klinická farmacie - ambulance pro lékové problémy",
          "Funkční diagnostika - EKG, ECHO, spirometrie",
          "Ambulance alergologie a klinické imunologie",
          "Erytrocyty ve fázovém kontrastu / v zástinu - PIO 1.patro (budova B)",
          "Pohotovost pro dospělé",
          "Test oGTT - dospělí - PIO 1.patro (budova B)",
          "Centrální odběry OKB - PIO 1. patro (budova B)",
          "Poradna pro hyperlipidémie / Biochemická poradna",
          "Oddělení klinické biochemie Liberec"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "Psychologická poradna pro ambulatní pacienty",
          "Všeobecná interna - lůžkové oddělení",
          "Cévní poradna",
          "Ambulance - interních oborů, diabetologie, obezitologie",
          "Ortopedie - příjem pacientů",
          "Poradna pro spinální pacienty",
          "Ambulance endokrinologie Liberec",
          "Revmatologická ambulance",
          "Ambulance biologické léčby",
          "Spinální jednotka",
          "Sociální služby",
          "Revmatologie"
        ]
      },
      {
        "label": "3. podlaží",
        "departments": [
          "Rehabilitace - lůžkové oddělení",
          "Poradna nefrologická predialyzační – PIO",
          "Poradna hemodialýza a peritoneální dialýza – PIO",
          "Plicní oddělení",
          "Oddělení nefrologie a dialýzy"
        ]
      },
      {
        "label": "4. podlaží",
        "departments": [
          "JIP a JIMP interních oborů",
          "Ambulance preventivní péče",
          "Interní konziliární ambulance",
          "Endoskopie",
          "Gastroenterologie"
        ]
      },
      {
        "label": "5. podlaží",
        "departments": [
          "Gastroenterologie – sonografie II, elastografie",
          "Interna - lůžková stanice 5A",
          "Ambulance chronické bolesti CARIM",
          "Kardiocentrum recepce",
          "Plicní sálek",
          "Převazy – diabetologie",
          "Poradna pro gestační diabetes a gravidní diabetičky",
          "Podiatrická ambulance",
          "Odběry – diabetologie",
          "Obezitologická poradna opět v provozu od ledna 2026",
          "Diabetologická ambulance",
          "Dětská ortopedická poradna",
          "Ambulance ortopedie",
          "Nutriční ambulance",
          "Anesteziologická ambulance",
          "Poradna pro poruchy srdečního rytmu",
          "Poradna pro plicní hypertenzi",
          "Poradna pro chlopenní vady",
          "Poradna pro arteriální hypertenzi",
          "Poradna chronického srdečního selhání",
          "Poradna pro ischemickou chorobu srdeční",
          "Angiologická poradna",
          "Ergometrická vyšetřovna",
          "ECHO laboratoř",
          "Neinvazivní kardiologie",
          "Diabetologické oddělení",
          "Diabetologické centrum"
        ]
      },
      {
        "label": "6. podlaží",
        "departments": [
          "Kardiocentrum - Katlab, lůžková stanice 6A, JIP, jednotka intermediální péče, ECHO",
          "Implantační sál",
          "Elektrofyziologie",
          "Intervenční kardiologie",
          "ECHO laboratoř TEE",
          "Invazivní kardiologie"
        ]
      },
      {
        "label": "7. podlaží",
        "departments": [
          "Denní stacionář neurologie",
          "Denní stacionář neurologie",
          "Neurologická ambulance",
          "Neurology",
          "Neurosurgery",
          "Neurophysiology Lab (SSEP, MEP, BAEP)",
          "Regionální centrum spasticity",
          "Epilepsy and headaches",
          "Epileptologická poradna",
          "Multiple sclerosis and inflammatory diseases of the CNS",
          "Neurosonography and Neurovascular consulting",
          "Neurosonografická poradna",
          "Neurovascular diseases",
          "SONO karotid a TCD",
          "Extrapyramidal disorders",
          "Extrapyramidová poradna",
          "EMG laboratory",
          "EMG laboratoř",
          "EEG",
          "EEG laboratoř",
          "General neurology",
          "Spine surgery post-operative",
          "Spondylochirurgická ambulance – pooperační",
          "Spine surgery",
          "Spondylochirurgická ambulance",
          "General",
          "Neurochirurgická indikační ambulance",
          "Neurovascular",
          "Neurovaskulární a neuroendokrinologická ambulance",
          "Neurologie",
          "Neurochirurgie",
          "Neurocenter",
          "Neurocentrum"
        ]
      },
      {
        "label": "8. podlaží",
        "departments": [
          "JIP Neurocentra",
          "COS NO",
          "Ortopedie"
        ]
      }
    ]
  },
  {
    "id": "C",
    "name": "Komplexní onkologické centrum",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-c",
    "floors": [
      {
        "label": "Podlaží S2",
        "departments": [
          "Onkologie - lineární urychlovač HARMONY, simulátor, ordinace radioterapie č. 1"
        ]
      },
      {
        "label": "Podlaží S1",
        "departments": [
          "Onkologie - lineární urychlovač I a II, RTG terapie, ordinace radioterapie č. 2, 3, 4"
        ]
      },
      {
        "label": "Přízemí",
        "departments": [
          "Oddělení klinické onkologie",
          "Komplexní onkologické centrum"
        ]
      },
      {
        "label": "1.podlaží",
        "departments": [
          "Onkologie - lůžkové oddělení"
        ]
      }
    ]
  },
  {
    "id": "D",
    "name": "Centrum následné péče, ÚČOCH, ORL, oční",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-d",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Pokladna ONP",
          "Geriatrická ambulance",
          "Duchovní péče",
          "Rehabilitace ONP",
          "Stomatologická pohotovost",
          "Oddělení nemocí z povolání",
          "Sociální poradenství ONP",
          "Poradna pro poruchy paměti",
          "Úrazy a akutní stavy",
          "Ambulance ÚČOCH",
          "Poradna vrozených vývojových vad sluchu novorozenců",
          "Poradna pro chirurgii v oblasti krku",
          "Poradna pro chirurgii středního ucha"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "ONP - oddělení následné péče 1.p."
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "ONP - oddělení následné péče 2.p."
        ]
      },
      {
        "label": "3. podlaží",
        "departments": [
          "Rinologická poradna",
          "Poradna pro operace štítné žlázy",
          "Poradna pro chrápání a zástavu dechu ve spánku",
          "Pohotovost ORL",
          "Ambulance ORL",
          "Otorinolaryngologie (ORL)"
        ]
      },
      {
        "label": "4. podlaží",
        "departments": [
          "COS OZO",
          "Konzilia pro jiná odd. KNL",
          "Ambulance pro předpis speciální optiky",
          "Ambulance pro choroby sítnice",
          "Dětská a strabologická poradna",
          "Pohotovost Oční",
          "Všeobecná oftalmologická ambulance",
          "Ústní, čelistní a obličejová chirurgie (ÚČOCH)",
          "Oční oddělení"
        ]
      }
    ]
  },
  {
    "id": "E",
    "name": "Pavilon psychiatrie",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-e",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Poradna sexuologie",
          "Příjmová stanice (\"A\")"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Rehabilitační stanice (\"R\")"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "Pracovny, terapeutické místnosti, knihovna, sociální pracovnice"
        ]
      }
    ]
  },
  {
    "id": "F",
    "name": "Pavilon klinické mikrobiologie a imunologie",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-f",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Příjem vzorků - budova F",
          "Oddělení klinické mikrobiologie a imunologie"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Oddělení genetiky a molekulární diagnostiky"
        ]
      }
    ]
  },
  {
    "id": "N",
    "name": "Pavilon bakteriologie",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-n",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Odběrové místo OKMI",
          "Příjem vzorků - budova N"
        ]
      }
    ]
  },
  {
    "id": "G",
    "name": "Pavilon péče o matku a dítě",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-g",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Babybox",
          "Onkogynekologická poradna",
          "Poradna pro riziková těhotenství",
          "Onkogynekologická poradna",
          "Dětská pohotovost",
          "SONO dětských kyčlí",
          "Urogynekologická poradna",
          "Sonografie – konziliární vyšetření + amniocentézy",
          "Sonografie – screeningová vyšetření v těhotenství",
          "Poradna pro přednádorové stavy",
          "Zápis do porodnice",
          "Ultrazvuk 3D/4D",
          "Sonografie",
          "Indikační poradna",
          "Gynekologická ambulance – příjem pacientek",
          "Gynekologická ambulance"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Gynekologicko-porodnické oddělení"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "Dětské"
        ]
      },
      {
        "label": "3. podlaží",
        "departments": [
          "COS GYN",
          "Gynekologie - lůžkové oddělení, JIP, Centrální operační sály"
        ]
      },
      {
        "label": "4. podlaží",
        "departments": [
          "Laboratoř analýzy pohybu",
          "Konferenční místnost - PPMD",
          "Neonatologie"
        ]
      }
    ]
  },
  {
    "id": "I",
    "name": "Centrum psychiatrie",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-i",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Stanice pro léčbu závislosti na alkoholu (\"AT\")",
          "Ambulance, denní stacionáře, Záchytná stanice (\"ZS\")",
          "Oddělení psychiatrie pro dospělé"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Oddělení dětské a adolescentní psychiatrie – lůžka"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "Oddělení dětské a adolescentní psychiatrie – ambulance"
        ]
      }
    ]
  },
  {
    "id": "J",
    "name": "Stravovací provoz",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-j",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Sklady a výdej stravy"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Bufet KNL",
          "Zaměstnanecká jídelna KNL"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "Oddělení nutriční terapie",
          "Pokladna KNL",
          "Stravovací provoz - administrativa",
          "Podatelna KNL",
          "Catering"
        ]
      },
      {
        "label": "3. podlaží",
        "departments": [
          "Oddělení informačních a komunikačních technologií (ICT)"
        ]
      }
    ]
  },
  {
    "id": "K",
    "name": "Pavilon infekce a kožního oddělení",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-k",
    "floors": [
      {
        "label": "Suterén",
        "departments": [
          "Infekční oddělení - ambulance"
        ]
      },
      {
        "label": "Přízemí",
        "departments": [
          "Epikutánní testy",
          "Zákrokový sálek",
          "Preventivní dermatoonkologická poradna",
          "Akné poradna",
          "Melanomová poradna",
          "Kožní ambulance",
          "Ambulance světloléčby",
          "Ambulance fyzikální terapie – světloléčba",
          "Ambulance fyzikální terapie – aplikace tekutého dusíku",
          "Ambulance fyzikální terapie – aplikace sněhu CO2"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Oddělení dětské a adolescentní psychiatrie – lůžka",
          "Lymfodrenáže",
          "Kožní oddělení"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "Kožní oddělení - lůžka",
          "Infekční oddělení"
        ]
      }
    ]
  },
  {
    "id": "L",
    "name": "Lékárna",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-l",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Prodejna zdravotnických potřeb",
          "Nemocniční lékárna a prodejna zdravotnických potřeb"
        ]
      }
    ]
  },
  {
    "id": "O",
    "name": "Multioborový pavilon",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-o",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Oddělení urgentní medicíny - pracovny",
          "Klinická farmacie",
          "Genetická poradna"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Oddělení klinické farmacie, ICT",
          "Klinická biomechanika"
        ]
      }
    ]
  },
  {
    "id": "P",
    "name": "Centrum Patos",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-p",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Informace pro pozůstalé - soudní lékařství",
          "Vchod pro pozůstalé - patologie",
          "Toxikologická laboratoř – samoplátci",
          "Toxikologická laboratoř",
          "Oddělení soudního lékařství a toxikologie"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Centrum PATOS",
          "Patologie - laboratoře",
          "Přednáškový sál",
          "Lékařská knihovna"
        ]
      }
    ]
  },
  {
    "id": "Q",
    "name": "Ředitelství, ekonomický úsek, řízení lidských zdrojů",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-q",
    "floors": [
      {
        "label": "Hala",
        "departments": [
          "Středisko pro vědu, výzkum a inovace",
          "Právní oddělení",
          "Volná pracovní místa"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "Oddělení veřejných zakázek a dotací",
          "Obchodní oddělení",
          "Investiční oddělení"
        ]
      },
      {
        "label": "3. podlaží",
        "departments": [
          "Oddělení koordinace výstavby nového pavilónu",
          "Oddělení manažera PR",
          "Projektový manažer",
          "Středisko podpory prodeje zdravotních služeb",
          "Ekonomický úsek - účtování zdravotní péče",
          "Oddělení manažera kvality"
        ]
      },
      {
        "label": "4. podlaží",
        "departments": [
          "Obchodně-investiční ředitel",
          "Náměstek OŘLZ",
          "Lékařský ředitel",
          "Ekonomická ředitelka",
          "Náměstek pro koordinaci výstavby CUM",
          "Technický ředitel",
          "Manažer PR, tiskový mluvčí",
          "Sekretariát vedení společnosti",
          "Ředitelka pro ošetřovatelskou péči"
        ]
      },
      {
        "label": "5. podlaží",
        "departments": [
          "Úsek lidských zdrojů"
        ]
      },
      {
        "label": "6. podlaží",
        "departments": [
          "Konferenční místnosti, Oddělení řízení lidských zdrojů (OŘLZ)"
        ]
      }
    ]
  },
  {
    "id": "R",
    "name": "Centrum zobrazovacích metod",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-r",
    "floors": [
      {
        "label": "1. podlaží",
        "departments": [
          "Terasa, odpočívárna"
        ]
      },
      {
        "label": "Přízemí",
        "departments": [
          "Recepce, čekárna, vyšetřovny, aplikační místnosti",
          "Oddělení nukleární medicíny"
        ]
      },
      {
        "label": "Suterén",
        "departments": [
          "Radiofarmaceutická laboratoř"
        ]
      }
    ]
  },
  {
    "id": "S",
    "name": "Nefrologicko dialyzační centrum",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-s",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Poradna nefrologická a transplantační – satelit",
          "Krevní odběry – nefrologie"
        ]
      }
    ]
  },
  {
    "id": "T",
    "name": "Transfúzní oddělení a klinická hematologie",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-t",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Expedice transfuzních přípravků",
          "Konzultace pro dárce krve"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Odběry kontrolních vzorků",
          "Registrace dárců kostní dřeně",
          "Výdej výsledků",
          "Odběry a vyšetření samoplátců",
          "Dárci krve",
          "Terapeutické výkony",
          "Transfuzní oddělení",
          "Darování krve"
        ]
      },
      {
        "label": "2. podlaží",
        "departments": [
          "Poradna pro poruchy koagulace",
          "Hematologická ambulance",
          "Oddělení klinické hematologie"
        ]
      }
    ]
  },
  {
    "id": "U",
    "name": "Pavilon Jablonecká",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-u",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Praktický lékař",
          "Ambulance lymfoterapie",
          "Ambulance logopedie",
          "Ambulance klinické psychologie",
          "Ordinace praktického lékaře",
          "Ubytovací služby"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": [
          "Středisko podpůrné péče",
          "Oddělení nemocniční hygieny a epidemiologie",
          "Manažer komunikace, Amelie",
          "Dobromysl - dobrovolnické centrum",
          "Oddělení domácí péče (terénní ošetřovatelská péče - TOP)"
        ]
      }
    ]
  },
  {
    "id": "V",
    "name": "Provozní budova",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-v",
    "floors": [
      {
        "label": "Přízemí",
        "departments": [
          "Ambulance logopedie"
        ]
      },
      {
        "label": "1. podlaží",
        "departments": []
      },
      {
        "label": "2. podlaží",
        "departments": [
          "ZO odborové organizace OSZSP ČR",
          "Konferenční místnost Kaple"
        ]
      }
    ]
  },
  {
    "id": "HELIPORT",
    "name": "Heliport",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-heliport",
    "floors": [
      {
        "label": "1. patro",
        "departments": [
          "Vyhlídková plošina pro veřejnost"
        ]
      },
      {
        "label": "2. patro",
        "departments": [
          "Servisní zázemí heliportu"
        ]
      },
      {
        "label": "Přistávací plošina",
        "departments": [
          "Projekt nového heliportu"
        ]
      }
    ]
  },
  {
    "id": "UA",
    "name": "UA",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-ua",
    "floors": [
      {
        "label": "1. patro",
        "departments": [
          "Mateřská škola KNofLík"
        ]
      },
      {
        "label": "2. patro",
        "departments": []
      },
      {
        "label": "3. patro",
        "departments": [
          "Oddělení zdravotnické techniky (OZT)"
        ]
      },
      {
        "label": "4. patro",
        "departments": [
          "Oddělení ekonomických informací"
        ]
      }
    ]
  },
  {
    "id": "UB",
    "name": "UB",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-ub",
    "floors": [
      {
        "label": "1. patro",
        "departments": [
          "Mateřská škola KNofLík"
        ]
      },
      {
        "label": "2. patro",
        "departments": []
      },
      {
        "label": "3. patro",
        "departments": [
          "Oddělení bezpečnosti a krizového řízení",
          "Etická komise"
        ]
      },
      {
        "label": "4. patro",
        "departments": [
          "Oddělení provozu a správy majetku"
        ]
      }
    ]
  },
  {
    "id": "PARKING",
    "name": "Parkovací plochy",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-parking",
    "information": [
      {
        "label": "Informace o parkování",
        "title": "Parkovací plochy",
        "url": "https://www.nemlib.cz/mapa/parkovaci-plochy/"
      }
    ]
  },
  {
    "id": "UZAVERA",
    "name": "Stavba CUM a parkovacího domu",
    "sourceUrl": "https://www.nemlib.cz/mapa/#b-uzavera",
    "information": [
      {
        "label": "Informace o stavbě",
        "title": "Stavba CUM",
        "url": "https://www.nemlib.cz/mapa/stavba-cum/"
      }
    ]
  }
];

export function getCampusDirectoryEntry(buildingId: string): CampusDirectoryEntry | undefined {
  const normalizedId = buildingId.toUpperCase();
  const directoryId = CAMPUS_DIRECTORY_ALIASES[normalizedId] ?? normalizedId;
  return CAMPUS_DIRECTORY.find(entry => entry.id === directoryId);
}

