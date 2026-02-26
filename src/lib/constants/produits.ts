import {
    FlaskConical,
    Box,
    AlertTriangle,
    Beaker,
    Flame,
    Skull,
    HeartCrack,
    Fish,
    Bomb,
} from 'lucide-react';

export const GHS_PICTOGRAMS = [
    { code: 'GHS01', name: 'Explosif', icon: Bomb },
    { code: 'GHS02', name: 'Inflammable', icon: Flame },
    { code: 'GHS03', name: 'Comburant', icon: FlaskConical },
    { code: 'GHS04', name: 'Gaz sous pression', icon: Box },
    { code: 'GHS05', name: 'Corrosif', icon: Beaker },
    { code: 'GHS06', name: 'Toxique', icon: Skull },
    { code: 'GHS07', name: 'Nocif', icon: AlertTriangle },
    { code: 'GHS08', name: 'Danger santé', icon: HeartCrack },
    { code: 'GHS09', name: 'Danger environnement', icon: Fish },
];

export const HAZARD_STATEMENTS = [
    'H225', 'H226', 'H228', 'H242', 'H250', 'H251', 'H252',
    'H260', 'H261', 'H270', 'H271', 'H272', 'H280', 'H281',
    'H290', 'H300', 'H301', 'H302', 'H304', 'H310', 'H311',
    'H312', 'H314', 'H315', 'H317', 'H318', 'H319', 'H330',
    'H331', 'H332', 'H334', 'H335', 'H336', 'H340', 'H341',
    'H350', 'H351', 'H360', 'H361', 'H362', 'H370', 'H371',
    'H372', 'H373', 'H400', 'H410', 'H411', 'H412', 'H413',
];

export const PRECAUTIONARY_STATEMENTS = [
    'P101', 'P102', 'P103', 'P201', 'P202', 'P210', 'P211',
    'P220', 'P221', 'P222', 'P223', 'P230', 'P231', 'P232',
    'P233', 'P234', 'P235', 'P240', 'P241', 'P242', 'P243',
    'P244', 'P250', 'P251', 'P260', 'P261', 'P262', 'P263',
    'P264', 'P270', 'P271', 'P272', 'P273', 'P280', 'P281',
    'P282', 'P283', 'P284', 'P285', 'P301', 'P302', 'P303',
];

export const PRODUCT_UNITS = [
    { value: 'kg', label: 'Kilogramme (kg)' },
    { value: 'g', label: 'Gramme (g)' },
    { value: 'mg', label: 'Milligramme (mg)' },
    { value: 'L', label: 'Litre (L)' },
    { value: 'mL', label: 'Millilitre (mL)' },
    { value: 'unite', label: 'Unité' },
    { value: 'autre', label: 'Autre' },
];
