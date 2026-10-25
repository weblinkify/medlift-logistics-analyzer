-- Reference network: HUS (Helsinki University Hospital) district, Uusimaa, Finland.
-- Coordinates are approximate; daily_shipments are illustrative demo volumes.
-- Keep in sync with frontend/src/domain/seed.ts (used by the browser mock mode).

INSERT INTO facility (id, code, name, city, facility_type, latitude, longitude, has_drone_pad, daily_shipments) VALUES
    (1, 'HUS-MEI', 'Meilahti Tower Hospital & HUSLAB Hub', 'Helsinki', 'HUB',      60.1906, 24.9036, TRUE,  0),
    (2, 'HUS-JOR', 'Jorvi Hospital',                       'Espoo',    'HOSPITAL', 60.2203, 24.6728, TRUE,  14),
    (3, 'HUS-PEI', 'Peijas Hospital',                      'Vantaa',   'HOSPITAL', 60.3297, 25.0577, TRUE,  12),
    (4, 'HUS-MAL', 'Malmi Hospital',                       'Helsinki', 'HOSPITAL', 60.2475, 25.0130, TRUE,  8),
    (5, 'HUS-TOO', 'Töölö Hospital',                       'Helsinki', 'HOSPITAL', 60.1855, 24.9213, FALSE, 10),
    (6, 'HUS-HER', 'Herttoniemi Hospital',                 'Helsinki', 'HOSPITAL', 60.1952, 25.0365, TRUE,  5),
    (7, 'HUS-POR', 'Porvoo Hospital',                      'Porvoo',   'HOSPITAL', 60.3960, 25.6640, TRUE,  6),
    (8, 'HUS-HYV', 'Hyvinkää Hospital',                    'Hyvinkää', 'HOSPITAL', 60.6270, 24.8600, TRUE,  7),
    (9, 'HUS-LOH', 'Lohja Hospital',                       'Lohja',    'HOSPITAL', 60.2530, 24.0640, TRUE,  6);

SELECT setval(pg_get_serial_sequence('facility', 'id'), (SELECT MAX(id) FROM facility));

INSERT INTO restricted_zone (id, code, name, severity, center_latitude, center_longitude, radius_km, authority, notes) VALUES
    (1, 'EFHK-CTR',  'Helsinki-Vantaa (EFHK)',          'RESTRICTED', 60.3172, 24.9633, 6.0, 'Fintraffic ANS',
        'Airport control zone core. UAS operations require ATC authorisation.'),
    (2, 'EFHF',      'Malmi Airfield (EFHF)',            'RESTRICTED', 60.2546, 25.0428, 1.5, 'Fintraffic ANS',
        'General aviation aerodrome traffic zone.'),
    (3, 'GOV-HKI',   'Helsinki Government Quarter',      'PROHIBITED', 60.1695, 24.9525, 1.2, 'Traficom',
        'Permanent prohibited area over state buildings.'),
    (4, 'MIL-SANTA', 'Santahamina Garrison',             'PROHIBITED', 60.1500, 25.0500, 1.5, 'Finnish Defence Forces',
        'Military area. No UAS operations.'),
    (5, 'ECO-KESK',  'Keskuspuisto Nature Corridor',     'ADVISORY',   60.2300, 24.9200, 2.0, 'City of Helsinki',
        'Wildlife-sensitive corridor. Avoid low-altitude hovering.');

SELECT setval(pg_get_serial_sequence('restricted_zone', 'id'), (SELECT MAX(id) FROM restricted_zone));
