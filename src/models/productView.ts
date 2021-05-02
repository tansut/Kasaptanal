import { Badge } from "./badge";
import { Puan } from "./puan";
import { PriceSlice } from "../lib/logistic/core";
import { NutritionView, PriceDiscount, PriceView } from "./common";
import { ShipmentDayHours } from "./shipment";
import { ButcherUnitEdit, ButcherUnitSelection } from "../db/models/product";

export interface PurchaseOption {
    id: number;
    enabled: boolean;
    unit: string,
    unitTitle: string,
    unitWeight: string;
    desc: string,
    notePlaceholder: string;
    kgRatio: number,
    customPrice: boolean;
    customWeight: boolean;
    unitPrice: number,
    displayOrder: number;
    min: number;
    max: number;
    default: number;
    perPerson: number;
    step: number;
    weigthNote: string;
    butcherUnitSelection: ButcherUnitSelection;   
    butcherUnitEdit: ButcherUnitEdit;   

    discount: PriceDiscount;
    discountValue: number;
    regularUnitPrice: number;
}

export interface ButcherPurchaseOption {
    unit: string;
    unitPrice: number;
}



export interface AlternateButchersView {
    butcher: ProductButcherView;
    dispatcher: ProductDispatcherView;    
    purchaseOptions: ButcherPurchaseOption[];
}

export interface ProductButcherView {
    shipday0: boolean;
    shipday1: boolean;
    shipday2: boolean;
    shipday3: boolean;
    shipday4: boolean;
    shipday5: boolean;
    shipday6: boolean;
    slug: string;
    name: string;
    productNote: string;
    enableCreditCard: boolean;
    badges: Badge[];
    id: number;
    kgPrice: number;
    thumbnail?: string;
    userRatingAsPerc: number;
    shipRatingAsPerc: number;
    shipSuccessText: string;
    puanData: Puan;    
    locationText: string;
    earnedPuan: number;
    description: string;
    calculatedRate: number;
}

export interface ProductDispatcherView {
    type: string;
    id: number;
    minCalculated: number;
    fee: number;
    totalForFree: number;
    priceInfo: string;
    userNote: string;
    takeOnly: boolean;
    distance: number;
    priceSlice: PriceSlice [];
}



export interface ResourceView {
    id: number,
    title: string,
    thumbnailUrl: string,
    tag1: string,
    settings: any
}

export interface ProductView {
    id: number;
    source: 'product' | 'butcher';
    butcher?: ProductButcherView;
    butcherNote?: string;
    butcherLongNote?: string;
    dispatcher?: ProductDispatcherView
    slug: string;
    kgPrice: number;
    kgTitle: string;

    discount: PriceDiscount;
    discountValue: number;
    kgRegularPrice: number;

    name: string;
    productType: string;
    priceView: PriceView;
    // viewUnitPrice: number;
    // viewUnit: string;
    // viewUnitDesc: string;
    // viewUnitAmount: number;
    shortDesc: string;
    notePlaceholder: string;
    purchaseOptions: PurchaseOption[];
    //defaultUnit: number
    resources?: ResourceView[];
    nutritionView: NutritionView;
    shipmentDayHours: ShipmentDayHours [];
    alternateButchers: AlternateButchersView[]
}

export interface ProductViewForButcher extends ProductView  {
    butcherProductNote: string;
    priceUnit: string;
    fromButcherNote: string;
    enabled: boolean;
    
}