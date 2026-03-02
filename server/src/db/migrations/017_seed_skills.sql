TRUNCATE cnf_skills;

INSERT INTO cnf_skills (id, name, parent_id, slug) VALUES
(1, 'Elektrotechnik & Energie', NULL, 'elektro'),
(2, 'Sanitär, Heizung & Klima', NULL, 'shk'),
(3, 'Bau, Ausbau & Rohbau', NULL, 'bau'),
(4, 'Holz, Möbel & Innenausbau', NULL, 'holz'),
(5, 'Maler, Lackierer & Boden', NULL, 'finish'),
(6, 'Garten, Forst & Außenanlagen', NULL, 'outdoor'),
(7, 'KFZ, Zweirad & Mechanik', NULL, 'kfz'),
(8, 'Haushaltsgeräte & Elektronik', NULL, 'geraete'),
(9, 'Schloss, Schlüssel & Sicherheit', NULL, 'security');

INSERT INTO cnf_skills (name, parent_id, slug) VALUES
-- ELEKTRO (ID 1)
('Hausinstallation & Leitungen', 1, 'el-haus'), ('Sicherungskasten & Verteilung', 1, 'el-box'),
('Photovoltaik-Montage', 1, 'el-pv'), ('Wechselrichter-Service', 1, 'el-inv'),
('Wallbox & E-Mobilität', 1, 'el-wall'), ('Beleuchtungssysteme (LED)', 1, 'el-light'),
('Smart Home (KNX/Loxone)', 1, 'el-smart'), ('Sprechanlagen & Video', 1, 'el-com'),
('Netzwerktechnik & WLAN', 1, 'el-lan'), ('Blitzschutz & Erdung', 1, 'el-prot'),
('Elektro-Notdienst', 1, 'el-sos'), ('DGUV V3 Prüfung', 1, 'el-check'),

-- SHK (ID 2)
('Heizungswartung (Gas/Öl)', 2, 'shk-heat'), ('Wärmepumpen-Installation', 2, 'shk-pump'),
('Bad-Komplettsanierung', 2, 'shk-bath'), ('Armaturentausch & Reparatur', 2, 'shk-tap'),
('Rohrreinigung & Verstopfung', 2, 'shk-pipe'), ('Leckortung & Wasserschaden', 2, 'shk-leak'),
('Klimaanlagen-Service', 2, 'shk-ac'), ('Lüftungsbau', 2, 'shk-vent'),
('Solarthermie', 2, 'shk-solar'), ('Fußbodenheizung', 2, 'shk-floor'),
('Trinkwasserfilter-Wartung', 2, 'shk-water'), ('Brennwerttechnik', 2, 'shk-gas'),

-- BAU & ROHBAU (ID 3)
('Maurerarbeiten', 3, 'bau-wall'), ('Beton- & Stahlbetonbau', 3, 'bau-con'),
('Verputzarbeiten (Innen/Außen)', 3, 'bau-plaster'), ('Estrich legen', 3, 'bau-floor'),
('Trockenbau & Rigips', 3, 'bau-dry'), ('Dachdeckerarbeiten', 3, 'bau-roof'),
('Dachrinnenreinigung', 3, 'bau-gutter'), ('Fassadendämmung (WDVS)', 3, 'bau-iso'),
('Fenstereinbau & Montage', 3, 'bau-win'), ('Kellertrockenlegung', 3, 'bau-base'),
('Abbruch & Entkernung', 3, 'bau-demo'), ('Gerüstbau', 3, 'bau-scaf'),

-- HOLZ & MÖBEL (ID 4)
('Möbelaufbau (IKEA etc.)', 4, 'wd-ass'), ('Küchenmontage', 4, 'wd-kit'),
('Tischler-Einzelanfertigung', 4, 'wd-custom'), ('Türöffnung & Montage', 4, 'wd-door'),
('Treppenbau & Renovierung', 4, 'wd-stair'), ('Carport & Pergola', 4, 'wd-car'),
('Terrassenbau (Holz/WPC)', 4, 'wd-deck'), ('Restaurierung antiker Möbel', 4, 'wd-rest'),
('Holzschutz & Lasur', 4, 'wd-coat'), ('Fensterrahmen-Reparatur', 4, 'wd-win-fix'),

-- FINISH: MALER & BODEN (ID 5)
('Malerarbeiten (Innen)', 5, 'fin-paint'), ('Tapezieren', 5, 'fin-paper'),
('Fassadenanstrich', 5, 'fin-fac'), ('Lackierarbeiten (Türen/Heizkörper)', 5, 'fin-lac'),
('Fliesenlegen (Wand/Boden)', 5, 'fin-tile'), ('Laminat & Vinyl verlegen', 5, 'fin-lam'),
('Parkett schleifen & versiegeln', 5, 'fin-park'), ('Teppichbodenverlegung', 5, 'fin-carpet'),
('Spachteltechnik (Stucco)', 5, 'fin-stuc'), ('Schimmelbeseitigung', 5, 'fin-mold'),

-- OUTDOOR: GARTEN (ID 6)
('Rasenmähen & Pflege', 6, 'gar-mow'), ('Heckenschnitt', 6, 'gar-hedge'),
('Baumfällung & Seilklettertechnik', 6, 'gar-tree'), ('Pflastersteine reinigen', 6, 'gar-clean'),
('Zaunbau (Metall/Holz)', 6, 'gar-fence'), ('Bewässerungssysteme', 6, 'gar-irr'),
('Teichbau & Pflege', 6, 'gar-pond'), ('Erdbewegung & Baggerarbeiten', 6, 'gar-dig'),
('Winterdienst', 6, 'gar-snow'), ('Rollrasen verlegen', 6, 'gar-turf'),

-- KFZ & MECHANIK (ID 7)
('Reifenservice', 7, 'kfz-tire'), ('Ölwechsel & Inspektion', 7, 'kfz-oil'),
('Bremsenservice', 7, 'kfz-brake'), ('KFZ-Aufbereitung/Reinigung', 7, 'kfz-det'),
('Smart Repair (Dellen/Kratzer)', 7, 'kfz-dent'), ('Fahrrad-Reparatur (E-Bike)', 7, 'kfz-bike'),
('Motorrad-Wartung', 7, 'kfz-moto'), ('Anhängerkupplung Montage', 7, 'kfz-hitch'),
('Autoglas-Reparatur', 7, 'kfz-glass'), ('Fehlerspeicher auslesen', 7, 'kfz-diag'),

-- HAUSHALTSGERÄTE (ID 8)
('Waschmaschinen-Reparatur', 8, 'app-wash'), ('Geschirrspüler-Service', 8, 'app-dish'),
('Kühlschrank & Gefriertruhe', 8, 'app-fridge'), ('Backofen & Herd Anschluss', 8, 'app-oven'),
('Kaffeevollautomaten-Wartung', 8, 'app-coffe'), ('Staubsauger-Reparatur', 8, 'app-vac'),
('TV-Wandmontage & Setup', 8, 'app-tv'), ('PC-Hilfe & Software-Setup', 8, 'app-pc'),
('Smartphone Display-Tausch', 8, 'app-phone'), ('Dunstabzugshauben', 8, 'app-hood'),

-- SECURITY (ID 9)
('Schlüsseldienst (Notöffnung)', 9, 'sec-key'), ('Schließzylinder-Tausch', 9, 'sec-cyl'),
('Einbruchschutz-Beratung', 9, 'sec-prot'), ('Alarmanlagen', 9, 'sec-alarm'),
('Tresor-Transport & Montage', 9, 'sec-safe'), ('Rauchmelder-Wartung', 9, 'sec-smoke');
