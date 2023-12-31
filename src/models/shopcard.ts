import { AppRequest, ValidationError } from "../lib/http";
import Product, { ProductType } from "../db/models/product";
import { PurchaseOption, ProductView } from "./productView";
import Helper from "../lib/helper";
import { Shipment, ShipmentDayHours, ShipmentType, ShipmentTypeDesc } from "./shipment";
import { Payment, PaymentType, PaymentTypeDesc } from "./payment";
import { Order } from "../db/models/order";
import * as _ from "lodash"
import { GeoLocation, LocationType } from "./geo";
const orderid = require('order-id')('dkfjsdklfjsdlkg450435034.,')

export interface ShopcardAdres {
    name: string;
    email: string;
    phone: string;
    level1Id: number;
    level2Id: number;
    level3Id: number;
    level4Id: number;
    saveaddress: boolean;
    adres: string;
    bina: string;
    kat: string;
    daire: string;
    addresstarif: string;
    level1Text: string;
    level2Text: string;
    level3Text: string;
    level4Text: string;
    location?: GeoLocation;
    accuracy?: number;

    geolocation: GeoLocation;
    geolocationType: LocationType;


}

class Modifier {
    type: 'discount' | 'puan'
    code: string;
    name: string;
    percent: number;
    net: number;
    subTotal: number;
}

export class Discount extends Modifier {
    get calculated() {
        if (this.percent > 0)
            return Helper.asCurrency(-1 * this.subTotal * (this.percent / 100))
        else return -1 * this.net
    }
}

export class ShippingCost extends Modifier {
    get calculated() {
        return this.net
    }
}

export let firstOrderDiscount = Object.assign(new Discount(), {
    type: 'puan',
    code: 'ilksiparis',
    name: 'İlk sipariş indirimi',
    percent: 3,
    net: 0
})

// export let sub14OrderDiscount = Object.assign(new Discount(), {
//     code: '14subat',
//     name: '14 Şubat indirimi',
//     percent: 5,
//     net: 0
// })

export interface ShopcardButcherView {
    slug: string;
    name: string;
    id: number;
    onlinePayment: boolean;
    subTotal: number;
    products: number[];
    userSelected: boolean;
    note: string;
}

export interface ShopcardProductView {
    id: number;
    name: string;
    kgPrice: number;
    productType: string;
    slug: string;
    butcher: {
        id: number;
        slug: string;
        name: string;
        enableCreditCard: boolean;
        userSelected: boolean;
    }
}

export class ShopCard {
    note: string;
    created: Date;
    address: ShopcardAdres = {
        name: '',
        email: '',
        phone: '',
        level1Id: 0,
        level2Id: 0,
        level3Id: 0,
        level4Id: 0,
        saveaddress: true,
        adres: '',
        addresstarif: '',
        bina: '',
        kat: '',
        daire: '',
        level1Text: '',
        level2Text: '',
        level3Text: '',
        level4Text: '',
        location: null,
        geolocation: null,
        geolocationType: "UNKNOWN"
    };
    butchers: { [key: number]: ShopcardButcherView; } = {};
    shipment: { [key: number]: Shipment; } = {};
    payment: { [key: number]: Payment; } = {};
    shippingCosts: { [key: number]: ShippingCost; } = {};
    butcherDiscounts: { [key: number]: Discount[]; } = {};
    discounts = [];
    items: ShopcardItem[] = [];

    availableShipHours: ShipmentDayHours[] = [];

    getPaymentTotal(type: string) {
        let total = 0.00;
        for (var bi in this.payment) {
            if (this.payment[bi].type == type) {
                total += Helper.asCurrency(this.getButcherTotal(bi));
            }
        }
        return Helper.asCurrency(total)
    }

    getButcherDiscountTotal(bi) {
        let totalPrice = 0;
        if (!this.butcherDiscounts[bi])
            return 0.00;
        this.butcherDiscounts[bi].forEach(d => (totalPrice += (d.type == 'discount' ? d.calculated : 0.00)));
        return Helper.asCurrency(totalPrice);
    }

    getButcherTotal(bi) {
        let totalPrice = this.butchers[bi].subTotal;
        let discounts = this.getButcherDiscountTotal(bi);
        let shippings = this.getShippingCostOfCustomer(bi);
        return totalPrice + discounts + shippings;
    }

    getButcherTotalWithoutShipping(bi) {
        let totalPrice = this.butchers[bi].subTotal;
        let discounts = this.getButcherDiscountTotal(bi);
        return totalPrice + discounts;
    }


    // butcherDi(bi) {
    //     let shipment = this.shipment[bi];
    //     if (!shipment.dispatcher) 

    // }


    get butcherDiscountTotal() {
        let totalPrice = 0;
        for (let s in this.butcherDiscounts) {
            totalPrice += this.getButcherDiscountTotal(s)
        }
        return Helper.asCurrency(totalPrice)
    }

    get discountTotal() {
        let totalPrice = 0;
        this.discounts.forEach(p => {
            totalPrice += (p.type == 'discount' ? p.calculated : 0.00);
        })
        return Helper.asCurrency(totalPrice + this.butcherDiscountTotal)
    }

    get shippingTotal() {
        let totalPrice = 0;
        for (let s in this.shippingCosts)
            totalPrice += this.shippingCosts[s].calculated;
        return Helper.asCurrency(totalPrice)
    }

    get total() {
        return this.subTotal + this.discountTotal + this.shippingTotal;
    }


    get subTotal() {
        let totalPrice = 0;
        this.items.forEach(p => {
            totalPrice += p.price;
        })
        return Helper.asCurrency(totalPrice)
    }



    remove(i) {
        this.items.splice(i, 1);
        this.arrangeButchers();
        this.calculateShippingCosts();
    }

    removeItemById(id: string) {
        _.remove(this.items, i => i.id == id)
        this.arrangeButchers();
        this.calculateShippingCosts();
    }

    static calculatePrice(product: ProductView, quantity: number, purchaseoption: PurchaseOption) {
        return Helper.asCurrency(purchaseoption.unitPrice * quantity);
    }

    // getShippingCostOfButcher(bi) {
    //     let shipment = this.shipment[bi];
    //     let butcher = this.butchers[bi];
    //     if (shipment.howTo == "take")
    //         return 0.00;
    //     if (shipment.dispatcher && shipment.dispatcher.type == "butcher") {
    //         if (shipment.dispatcher.totalForFree <= 0) {
    //             return shipment.dispatcher.fee;
    //         }
    //         else return (Math.max(0.00, (shipment.dispatcher.totalForFree - butcher.subTotal > 0) ? shipment.dispatcher.fee : 0))
    //     } else return 0.00;
    // }


    getShippingCostOfCustomer(bi) {
        let shipment = this.shipment[bi];
        let butcher = this.butchers[bi];
        if (shipment.howTo == "take")
            return 0.00;
        if (shipment.dispatcher) {
            return shipment.dispatcher.fee;
            // shipment.dispatcher.provider.calculateFeeForCustomer({
            //     orderTotal: butcher.subTotal
            // })
            // if (shipment.dispatcher.type == "butcher")
            //     return this.getShippingCostOfButcher(bi)
            // else {
            //     if (shipment.dispatcher.calculateCostForCustomer) {
            //         let result = shipment.dispatcher.calculateCostForCustomer(shipment)
            //         return result;
            //     } else return Helper.asCurrency(shipment.dispatcher.fee / 2);

            // }  
        }
        return 0.00;
    }

    calculateShippingCosts() {
        this.shippingCosts = {};
        for (let k in this.butchers) {
            let butcher = this.butchers[k];
            let shipment = this.shipment[k];
            let cost = this.getShippingCostOfCustomer(k);
            if (cost > 0) {
                this.shippingCosts[k] = new ShippingCost();
                this.shippingCosts[k].name = butcher.name;
                this.shippingCosts[k].net = cost;
                this.shippingCosts[k].subTotal = butcher.subTotal;
            }
        }
    }

    arrangeButchers() {
        let shipment = {};
        let payment = {};
        let butchers = {}

        this.items.forEach((item, i) => {
            let bi = item.product.butcher.id
            if (!butchers[bi]) {
                butchers[bi] = item.product.butcher;
                butchers[bi].note = this.butchers[bi] ? this.butchers[bi].note:'';
                butchers[bi].products = [i];
                butchers[bi].subTotal = item.price;
                butchers[bi].userSelected = this.butchers[bi] ? this.butchers[bi].userSelected : false
            } else {
                butchers[bi].products.push(i);
                butchers[bi].subTotal += item.price;
            }
            if (this.shipment[bi])
                shipment[bi] = this.shipment[bi];
            else shipment[bi] = new Shipment();
            if (this.payment[bi])
                payment[bi] = this.payment[bi];
            else {
                let preferred = butchers[bi].enableCreditCard ? 'onlinepayment' : 'cashondoor';
                payment[bi] = Object.assign(new Payment(), {
                    type: preferred,
                    desc: PaymentTypeDesc[preferred]
                })
            }

        })
        this.butchers = butchers;
        this.shipment = shipment;
        this.payment = payment;
    }

    addProduct(product: ProductView, quantity: number, purchaseoption: PurchaseOption, note: string, productTypeData: any = {}) {
        quantity = Number(quantity.toFixed(3));
        let price = ShopCard.calculatePrice(product, quantity, purchaseoption);
        //let found = null; // this.items.find(p => p.note == note && p.product.id == product.id && p.purchaseoption.id == purchaseoption.id && p.product.butcher.id == product.butcher.id);
        // if (found) {
        //     found.quantity = quantity + found.quantity;
        //     found.price = price + found.price;
        // }
        try {
            this.items.push(new ShopcardItem(product, quantity, price, purchaseoption, note, productTypeData));

            let removed = [];

            if (Helper.isSingleShopcardProduct(product.productType)) {
                this.items = this.items.filter(p => p.product.productType == product.productType)
            } else {
                this.items = this.items.filter(p => !Helper.isSingleShopcardProduct(p.product.productType))
            }
            this.arrangeButchers();
            this.calculateShippingCosts();
        } catch (err) {
            throw err;
        }
    }

    isExpired(): boolean {
        if (!this.created) return false;
        let timespan = 6 * 60 * 60 * 1000;
        let d = Helper.Now()
        d.setTime(d.getTime() - timespan);
        return this.created < d;
    }



    constructor(values: any) {
        this.availableShipHours = Shipment.getShipmentDays();
        this.items = [];
        this.note = values.note || "";
        values = values || {};
        values.created = values.created || Helper.Now();
        this.created = typeof values.created == 'string' ? new Date(values.created) : values.created;
        values.items = values.items || [];
        values.items.forEach(i => {
            let item = new ShopcardItem(i.product, i.quantity, i.price, i.purchaseoption, i.note, i.productTypeData || {});
            item.id = i.id || item.id;
            this.items.push(item)
        })
        values.address = values.address || this.address;
        this.address = values.address;

        values.butchers = values.butchers || this.butchers;
        this.butchers = values.butchers;

        values.shipment = values.shipment || {};
        this.shipment = {}
        Object.keys(values.shipment).forEach(k => {
            let o = Object.assign(new Shipment(), values.shipment[k]);
            this.shipment[k] = o;
        })

        values.payment = values.payment || {};
        this.payment = {}
        Object.keys(values.payment).forEach(k => {
            let o = Object.assign(new Payment(), values.payment[k]);
            this.payment[k] = o;
        })

        let discounts = values.discounts || [];
        let subTotal = this.subTotal;

        discounts.forEach(d => {
            let o = Object.assign(new Discount(), d);
            o.subTotal = subTotal
            this.discounts.push(o)
        })

        values.butcherDiscounts = values.butcherDiscounts || {};
        this.butcherDiscounts = {}
        Object.keys(values.butcherDiscounts).forEach(k => {
            let discounts = values.butcherDiscounts[k] || []
            discounts.forEach((element, i) => {
                let o = Object.assign(new Discount(), element);
                discounts[i] = o;
            });

            this.butcherDiscounts[k] = discounts;
        })

        values.shippingCosts = values.shippingCosts || {};
        this.shippingCosts = {}
        Object.keys(values.shippingCosts).forEach(k => {
            let o = Object.assign(new ShippingCost(), values.shippingCosts[k]);
            this.shippingCosts[k] = o;
        })

    }

    clearBeforeSave() {
        // for (let o in this.shipment) {
        //     this.shipment[o].dispatcher = undefined
        // }
    }

    async saveToRequest(req: AppRequest) {
        this.clearBeforeSave();
        if (this.items.length == 0) {
            return await ShopCard.empty(req)
        }
        if (req.user) {
            req.user.shopcard = this
            await req.user.save();
            return this;
        } else if (req.session) {
            req.session.shopcard = this;
            return new Promise<any>((resolve, reject) => {
                req.session.save((err) => err ? reject(err) : resolve(null))
            })

        }
    }

    static async empty(req: AppRequest) {
        if (req.user) {
            req.user.shopcard = null;
            await req.user.save()
        }
        req.session.shopcard = null;
        return new Promise<void>((resolve, reject) => {
            req.session.save((err) => err ? reject(err) : resolve())
        })
    }

    addButcherDiscount(bi, discount: Discount) {
        if (!this.butcherDiscounts[bi])
            this.butcherDiscounts[bi] = [];
        this.butcherDiscounts[bi].push(discount)
    }

    removeButcherDiscount(bi, code: string) {
        if (this.butcherDiscounts[bi]) {
            _.remove(this.butcherDiscounts[bi], p => p.code == code)
        }
        this.butcherDiscounts[bi].length == 0 && delete this.butcherDiscounts[bi];

    }

    getOrderType() {
        if (this.items.length) {
            return this.items[0].product.productType
        } else return 'generic'
    }


    getButcherDiscount(bi, code: string) {
        if (!this.butcherDiscounts[bi])
            return null;
        return this.butcherDiscounts[bi].find(p => p.code == code)
    }

    async manageDiscounts() {
        // for(let b in this.butchers) {                
        //     let discountTotal = this.getButcherDiscountTotal(b);
        //     let discounts = this.butcherDiscounts[b];
        //     let butcherProducts = this.butchers[b].products;
        //     butcherProducts.forEach((pi) => {
        //         let product = this.items[pi];

        //     })
        // }        


        // for(let b in this.butchers) {                
        //     let applied = this.getButcherDiscount(b, sub14OrderDiscount.code);
        //     if (applied) {
        //         this.removeButcherDiscount(b, sub14OrderDiscount.code)  
        //         applied = null;
        //      }

        //     if (!applied) {
        //         this.addButcherDiscount(b, Object.assign(new Discount(), {
        //             code: sub14OrderDiscount.code,
        //             percent: sub14OrderDiscount.percent,
        //             name: sub14OrderDiscount.name,
        //             subTotal: this.butchers[b].subTotal
        //         }))    
        //     }
        // }        
    }

    async manageFirstOrderDiscount(hasFirstOrder: Order) {
        return;
        firstOrderDiscount.subTotal = this.subTotal;
        for (let b in this.butchers) {
            let applied = this.getButcherDiscount(b, firstOrderDiscount.code);
            if (applied) {
                this.removeButcherDiscount(b, firstOrderDiscount.code)
                applied = null;
            }
            if (!applied) {
                if (!hasFirstOrder) {
                    this.addButcherDiscount(b, Object.assign(new Discount(), {
                        type: firstOrderDiscount.type,
                        code: firstOrderDiscount.code,
                        percent: firstOrderDiscount.percent,
                        name: firstOrderDiscount.name,
                        subTotal: this.butchers[b].subTotal
                    }))
                }
            } else {
                if (hasFirstOrder) {
                    this.removeButcherDiscount(b, firstOrderDiscount.code)
                }
            }
        }



        // let firstOrderApplied = this.discounts.find(p => p.code == firstOrderDiscount.code);
        // if (!firstOrderApplied) {
        //     if (!firstOrder)
        //         this.discounts.push(firstOrderDiscount)
        // } else {
        //     if (firstOrder)
        //         _.remove(result.discounts, p => p.code == firstOrderDiscount.code)
        // }
    }

    static async createFromRequest(req: AppRequest): Promise<ShopCard> {
        let result: ShopCard;
        if (req.user && req.user.shopcard != null) {
            result = new ShopCard(req.user.shopcard)
        } else if (req.session.shopcard != null) {
            result = new ShopCard(req.session.shopcard);
        } else result = new ShopCard({});

        if (result.isExpired()) {
            await ShopCard.empty(req);
            result = new ShopCard({});
        }

        if (req.prefAddr) {
            result.address.level1Id = req.prefAddr.level1Id;
            result.address.level1Text = req.prefAddr.level1Text;

            result.address.level2Id = req.prefAddr.level2Id;
            result.address.level2Text = req.prefAddr.level2Text;

            result.address.level3Id = req.prefAddr.level3Id;
            result.address.level3Text = req.prefAddr.level3Text;

            result.address.level4Id = req.prefAddr.level4Id;
            result.address.level4Text = req.prefAddr.level4Text;
        }

        let butcherids = Object.keys(result.butchers || {})

        let firstOrder = !req.user ? null : await Order.findOne({
            where: {
                userid: req.user.id,
                butcherid: butcherids
            }
        })
        result.butcherDiscounts = {}
        await result.manageFirstOrderDiscount(firstOrder);
        await result.manageDiscounts();
        return result;
    }
}

export class ShopcardItem {
    // public discount: number = 0.00;
    public product: ShopcardProductView;
    public id: string;
    constructor(product: ProductView,
        public quantity: number, public price: number,
        public purchaseoption: PurchaseOption, public note: string, public productTypeData: Object) {
        if (!product) throw new ValidationError('geçersiz ürün');
        if (!quantity) throw new ValidationError('geçersiz miktar:' + product.name);
        if (!price) throw new ValidationError('geçersiz bedel: ' + product.name);
        this.id = orderid.generate();
        this.product = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            butcher: {
                id: product.butcher.id,
                slug: product.butcher.slug,
                name: product.butcher.name,
                enableCreditCard: product.butcher.enableCreditCard,
                userSelected: false
            },
            kgPrice: product.kgPrice,
            productType: product.productType
        }
    }
}