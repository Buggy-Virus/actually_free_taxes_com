/**
 * Local income tax jurisdictions a resident can pick (D1) and their rates.
 *
 * Sources (extracted from the official documents; see docs/remaining_gaps.md D2/D5/D6):
 *  - Maryland: Department of Legislative Services, "Local Income Tax Rates in Maryland" (2026CountyLocalTaxRates.pdf),
 *    calendar years 2024–2026; Anne Arundel and Frederick graduated schedules from the Comptroller.
 *  - Indiana: Departmental Notice #1 (R47 / 10-26), county rates effective Oct. 1, 2026 (used for tax year 2026).
 *  - New York City / Yonkers: Form IT-201 / IT-215 instructions (2024, 2025) and Form Y-203.
 */
const MD_FLAT = {
    // county: [2024, 2025, 2026]
    Allegany: [0.0303, 0.0303, 0.032], 'Baltimore City': [0.032, 0.032, 0.032], 'Baltimore County': [0.032, 0.032, 0.032],
    Calvert: [0.03, 0.032, 0.032], Caroline: [0.032, 0.032, 0.032], Carroll: [0.0303, 0.0303, 0.0303], Cecil: [0.0275, 0.0274, 0.0274],
    Charles: [0.0303, 0.0303, 0.0303], Dorchester: [0.032, 0.033, 0.033], Garrett: [0.0265, 0.0265, 0.0265], Harford: [0.0306, 0.0306, 0.0306],
    Howard: [0.032, 0.032, 0.032], Kent: [0.032, 0.032, 0.033], Montgomery: [0.032, 0.032, 0.032], "Prince George's": [0.032, 0.032, 0.032],
    "Queen Anne's": [0.032, 0.032, 0.032], "St. Mary's": [0.03, 0.032, 0.032], Somerset: [0.032, 0.032, 0.032], Talbot: [0.024, 0.024, 0.024],
    Washington: [0.0295, 0.0295, 0.0295], Wicomico: [0.032, 0.032, 0.032], Worcester: [0.0225, 0.0225, 0.0225]
};
/** Anne Arundel (2.70% / 2.81% → 2.94% from 2025 / 3.20%) and Frederick (2.25% / 2.75% / 2.96% / 3.20%) schedules. */
function mdGraduated(county, year) {
    if (county === 'Anne Arundel') {
        const mid = year >= 2025 ? 0.0294 : 0.0281;
        return {
            joint: [{ rate: 0.027, over: 0 }, { rate: mid, over: 75000 }, { rate: 0.032, over: 480000 }],
            other: [{ rate: 0.027, over: 0 }, { rate: mid, over: 50000 }, { rate: 0.032, over: 400000 }]
        };
    }
    return {
        joint: [{ rate: 0.0225, over: 0 }, { rate: 0.0275, over: 25000 }, { rate: 0.0296, over: 100000 }, { rate: 0.032, over: 250000 }],
        other: [{ rate: 0.0225, over: 0 }, { rate: 0.0275, over: 25000 }, { rate: 0.0296, over: 50000 }, { rate: 0.032, over: 150000 }]
    };
}
export function mdCountyRate(county, year) {
    if (county === 'Anne Arundel' || county === 'Frederick')
        return mdGraduated(county, year);
    const r = MD_FLAT[county];
    return r ? r[year >= 2026 ? 2 : year >= 2025 ? 1 : 0] : undefined;
}
/** Indiana county rates effective Oct. 1, 2026 (Departmental Notice #1, R47 / 10-26). */
export const IN_COUNTY_RATES_2026 = {
    Adams: 0.016, Allen: 0.0159, Bartholomew: 0.0175, Benton: 0.0179, Blackford: 0.025, Boone: 0.0171, Brown: 0.025234, Carroll: 0.024733,
    Cass: 0.0295, Clark: 0.02, Clay: 0.0235, Clinton: 0.0265, Crawford: 0.0165, Daviess: 0.015, Dearborn: 0.014, Decatur: 0.0245, DeKalb: 0.0213,
    Delaware: 0.015, Dubois: 0.012, Elkhart: 0.02, Fayette: 0.0282, Floyd: 0.0189, Fountain: 0.021, Franklin: 0.017, Fulton: 0.0288, Gibson: 0.013,
    Grant: 0.0275, Greene: 0.0235, Hamilton: 0.011, Hancock: 0.0194, Harrison: 0.01, Hendricks: 0.017, Henry: 0.0202, Howard: 0.0235,
    Huntington: 0.0195, Jackson: 0.021, Jasper: 0.02864, Jay: 0.025, Jefferson: 0.0103, Jennings: 0.025, Johnson: 0.014, Knox: 0.017,
    Kosciusko: 0.01, LaGrange: 0.0165, Lake: 0.015, LaPorte: 0.0145, Lawrence: 0.0175, Madison: 0.0225, Marion: 0.0202, Marshall: 0.0125,
    Martin: 0.025, Miami: 0.0254, Monroe: 0.0214, Montgomery: 0.0265, Morgan: 0.0272, Newton: 0.01, Noble: 0.0175, Ohio: 0.02, Orange: 0.0175,
    Owen: 0.025, Parke: 0.0265, Perry: 0.014, Pike: 0.012, Porter: 0.005, Posey: 0.0145, Pulaski: 0.0285, Putnam: 0.023, Randolph: 0.03,
    Ripley: 0.0238, Rush: 0.0215, 'St. Joseph': 0.0175, Scott: 0.0216, Shelby: 0.017, Spencer: 0.008, Starke: 0.0171, Steuben: 0.0199,
    Sullivan: 0.017, Switzerland: 0.0145, Tippecanoe: 0.0128, Tipton: 0.026, Union: 0.0275, Vanderburgh: 0.0125, Vermillion: 0.015,
    Vigo: 0.02, Wabash: 0.029, Warren: 0.0212, Warrick: 0.01, Washington: 0.02, Wayne: 0.0125, Wells: 0.021, White: 0.0232, Whitley: 0.016829
};
/** Localities offered in the picker, keyed "ST:Name". */
export function localityOptions(state) {
    switch ((state || '').toUpperCase()) {
        case 'NY': return [{ key: 'NY:NYC', label: 'New York City' }, { key: 'NY:Yonkers', label: 'Yonkers' }];
        case 'MD': return [...Object.keys(MD_FLAT), 'Anne Arundel', 'Frederick'].sort().map(c => ({ key: `MD:${c}`, label: `${c}${c.endsWith('City') || c.endsWith('County') ? '' : ' County'}` }));
        case 'IN': return Object.keys(IN_COUNTY_RATES_2026).map(c => ({ key: `IN:${c}`, label: `${c} County` }));
        default: return [];
    }
}
/** NYC household credit (IT-201 line 48, Tables 4–6), identical for 2024 and 2025. */
export const NYC_HOUSEHOLD_PER_PERSON = [
    { upTo: 15000, perPerson: 30, perPersonMfs: 15 },
    { upTo: 17500, perPerson: 25, perPersonMfs: 12.5 },
    { upTo: 20000, perPerson: 15, perPersonMfs: 7.5 },
    { upTo: 22500, perPerson: 10, perPersonMfs: 5 }
];
export const statusSchedule = (status) => (status === 'married_joint' ? 'joint' : 'other');
