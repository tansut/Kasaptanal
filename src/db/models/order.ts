import { Table, Column, DataType, Model, HasMany, CreatedAt, UpdatedAt, DeletedAt, Unique, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import BaseModel from "./basemodel"
import Helper from '../../lib/helper';
import { ShopCard, ShopcardItem, firstOrderDiscount } from '../../models/shopcard';
import Product from './product';
import Butcher from './butcher';
import { OrderItemStatus, OrderSource } from '../../models/order';
import Dispatcher from './dispatcher';
import { GeoLocation } from '../../models/geo';
import AccountModel from './accountmodel';
import { PuanResult } from '../../models/puan';
import { ProductTypeManager, ProductTypeFactory } from '../../lib/common';
const orderid = require('order-id')('dkfjsdklfjsdlkg450435034.,')

@Table({
    tableName: "Orders",
    indexes: [{
        fields: ['userId'],
        name: 'userid_idx'
    }, {
        fields: ['ordernum'],
        name: 'ordernum_idx',
        unique: true
    }]
})
class Order extends BaseModel<Order> {

    isFirstButcherOrder: boolean = false;
    isFirstOrder: boolean = false;
    workedAccounts: AccountModel[] = [];
    butcherPuanAccounts: AccountModel[] = [];
    kalittePuanAccounts: AccountModel[] = [];

    kalitteOnlyPuanAccounts: AccountModel[] = [];
    kalitteByButcherPuanAccounts: AccountModel[] = [];
    
    butcherDeptAccounts: AccountModel[] = [];

    puanSummary: PuanResult [] = [];

    @Column({
        allowNull: false,
    })
    userId: number;

    @Column({
        allowNull: false,
        defaultValue: false
    })
    noInteraction: boolean;

    @Column({
        allowNull: false,
    })
    ordernum: string;

    @Column({
        allowNull: true        
    })
    paymentId: string;    

    @Column({
        allowNull: false,
        defaultValue: OrderSource.kasaptanal
    })
    orderSource: string;    

    @Column({
        allowNull: true        
    })
    paymentTransactionId: string;        

    @Column({
        allowNull: true
    })  
    subMerchantStatus: string;        

    @Column({
        allowNull: true
    })
    ordergroupnum: string;    

    @Column({
        allowNull: true,
        type: DataType.TEXT
    })
    note: string;


    
    

    @ForeignKey(() => Butcher)
    butcherid: number;

    @BelongsTo(() => Butcher, "butcherid")
    butcher: Butcher;  
    
    @Column({
        allowNull: false,
        defaultValue: 'belli değil'        
    })
    butcherName: string;


    @Column({
        allowNull: false,
    })
    name: string;

    @Column({
        allowNull: false,
    })
    email: string;

    @Column({
        allowNull: false,
    })
    phone: string;

    @Column({
        allowNull: true
    })
    areaLevel1Id: number;

    @Column({
        allowNull: true
    })
    areaLevel2Id: number;

    @Column({
        allowNull: true
    })
    areaLevel3Id: number;

    @Column({
        allowNull: false,
        defaultValue: true
    })
    saveAddress: boolean;

    @Column({
        allowNull: true
    })
    address: string;

    @Column({
        allowNull: true
    })
    areaLevel1Text: string;

    @Column({
        allowNull: true
    })
    areaLevel2Text: string;

    @Column({
        allowNull: true
    })
    areaLevel3Text: string;

    @Column({
        allowNull: true,
        type: DataType.GEOMETRY('POINT')
    })
    shipLocation: GeoLocation;

    @Column
    shipLocationAccuracy: number

    @Column({
        allowNull: true,
        type: DataType.GEOMETRY('POINT')
    })
    dispatcherLocation: GeoLocation;    

    @Column({
        allowNull: true
    })
    dispatcherDistance: number;    

    @HasMany(() => OrderItem, {
        sourceKey: "id",
        foreignKey: "orderid",
        //as: "ButcherProduct"
    })
    items: OrderItem[];      

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    subTotal: number;

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    discountTotal: number;

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    shippingTotal: number;

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    total: number;

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2),
        defaultValue: 0.00
    })
    paidTotal: number;    

    @Column({
        allowNull: true    
    })    
    status: string;    

    @Column({
        allowNull: true    ,
        type: DataType.TEXT
    })    
    statusDesc: string;      

    @Column
    shopcardjson: Buffer

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(5, 2)
    })    
    userRating: number;    

    @ForeignKey(() => Dispatcher)
    dispatcherid: number;

    @Column({
        allowNull: true
    })
    dispatcherType: string;  

    @Column({
        allowNull: true
    })
    dispatcherName: string;      

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(13, 2)
    })
    dispatcherFee: number;     

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(13, 2)
    })
    dispatchertotalForFree: number;   
    
    @Column({
        allowNull: true
    })
    shipmentType: string;

    @Column({
        allowNull: true
    })
    shipmentTypeText: string;

    @Column({
        allowNull: true
    })
    shipmentHowTo: string;

    @Column({
        allowNull: true
    })
    shipmentHowToText: string;

    @Column({
        allowNull: true
    })
    shipmentdate: Date;

    @Column({
        allowNull: true
    })
    shipmenthour: number;

    @Column({
        allowNull: true
    })
    shipmenthourText: string;

    @Column({
        allowNull: true
    })
    paymentType: string;

    @Column({
        allowNull: true
    })
    paymentStatus: string;    

    @Column({
        allowNull: true
    })
    paymentTypeText: string;

    @Column({
        allowNull: true
    })
    shipmentInformMe: boolean;    




    get shopcard(): Object {
        return JSON.parse((<Buffer>this.getDataValue('shopcardjson')).toString())
    }

    set shopcard(value: Object) {
        this.setDataValue('shopcardjson', Buffer.from(JSON.stringify(value), "utf-8"));
    }

    static async fromShopcard(c: ShopCard, bi: number): Promise<Order> {
        let o = new Order();
        o.ordernum = orderid.generate();
        o.note = c.note;
        o.status = OrderItemStatus.supplying;
        let firstDiscount = c.getButcherDiscount(bi, firstOrderDiscount.code)
        o.isFirstButcherOrder = firstDiscount != null;
        o.discountTotal = c.getButcherDiscountTotal(bi);
        o.subTotal = c.butchers[bi].subTotal;        
        o.shippingTotal = c.getShippingCost(bi);
        o.total = c.getButcherTotal(bi);        
        o.areaLevel1Id = c.address.level1Id;
        o.areaLevel3Id = c.address.level3Id;
        o.areaLevel1Text = c.address.level1Text;
        o.areaLevel3Text = c.address.level3Text;
        o.email = c.address.email;
        o.address = c.address.adres;
        o.shipLocation = c.address.location;
        o.shipLocationAccuracy = c.address.accuracy;
        o.phone = c.address.phone;
        o.name = c.address.name;
        o.saveAddress = c.address.saveaddress;
        o.noInteraction = c.shipment[bi].nointeraction;
        if (c.shipment[bi].dispatcher) {
            o.dispatcherid = c.shipment[bi].dispatcher.id;
            o.dispatcherFee = c.shipment[bi].dispatcher.fee;
            o.dispatcherName = c.shipment[bi].dispatcher.name;
            o.dispatcherType = c.shipment[bi].dispatcher.type;
            o.dispatchertotalForFree = c.shipment[bi].dispatcher.totalForFree;    
            o.dispatcherLocation = c.shipment[bi].dispatcher.location;            
            if (o.shipLocation && o.dispatcherLocation) {
                o.dispatcherDistance = Helper.distance(o.shipLocation, o.dispatcherLocation)
            }        
        }     
                
        
        o.shipmentHowTo = c.shipment[bi].howTo;
        o.shipmentHowToText = c.shipment[bi].howToDesc;
        o.paymentType = c.payment[bi].type;
        o.paymentTypeText = c.payment[bi].desc;
        o.shipmentType = c.shipment[bi].type;
        o.shipmentTypeText = c.shipment[bi].desc;
        o.shipmentdate = c.shipment[bi].days[0] ? new Date(c.shipment[bi].days[0]): null;
        o.shipmenthour = c.shipment[bi].hours[0];
        o.shipmenthourText = c.shipment[bi].hoursText[0];
        o.shipmentInformMe = c.shipment[bi].informMe;

        return o;
    }

}

@Table({
    tableName: "OrderItems",
    indexes: [{
        fields: ['orderId'],
        name: 'orderid_idx'
    }]
})
class OrderItem extends BaseModel<Order> {

    @ForeignKey(() => Order)
    orderid: number;

    @BelongsTo(() => Order, "orderid")
    order: Order;

    @ForeignKey(() => Product)
    productid: number;

    @BelongsTo(() => Product, "productid")
    product: Product;

    @Column({
        allowNull: false,
        defaultValue: 'generic'        
    })
    productType: string;    

    @Column({
        allowNull: true
    })
    custom1: string;   

    @Column({
        allowNull: true
    })
    custom2: string;   
    
    @Column({
        allowNull: true
    })
    custom3: string;   
    
    
    @Column({
        allowNull: true
    })
    custom4: string;   

    @Column({
        allowNull: true
    })
    custom5: string;    

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    quantity: number;

    @ForeignKey(() => Butcher)
    butcherid: number;

    @BelongsTo(() => Butcher, "butcherid")
    butcher: Butcher;    

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(5, 2)
    })    
    userRating: number;

    @Column({
        allowNull: true    
    })  
    paymentTransactionId: string;

    @Column({
        allowNull: true
    })  
    subMerchantStatus: string;    

    @Column({
        allowNull: true    
    })    
    status: string;    

    @Column({
        allowNull: true    ,
        type: DataType.TEXT
    })    
    statusDesc: string;    

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    kgPrice: number;

    @Column({
        allowNull: true
    })
    viewUnit: string;

    @Column({
        allowNull: true
    })
    viewUnitDesc: string;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(13, 2)
    })
    viewUnitAmount: number;

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(13, 2)
    })
    viewUnitPrice: number;


    @Column({
        allowNull: false
    })
    productName: string;


    @Column({
        allowNull: false,
        defaultValue: 0.00,
        type: DataType.DECIMAL(13, 2)
    })
    price: number;

    @Column({
        allowNull: false,
        defaultValue: 0.00,
        type: DataType.DECIMAL(13, 2)
    })
    paidPrice: number;    

    @Column({
        allowNull: false
    })
    pounit: string;

    @Column({
        allowNull: true
    })
    pounitTitle: string;    

    @Column({
        allowNull: true
    })
    pounitWeight: string;       

    @Column({
        allowNull: false,
        type: DataType.TEXT
    })
    pounitdesc: string;

    @Column({
        allowNull: true    
    })
    orderitemnum: string;


    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(13, 2)
    })
    pounitkgRatio: number;

    @Column({
        allowNull: false,
        defaultValue: 0,
        type: DataType.DECIMAL(13, 2)
    })
    pounitPrice: number;

    @Column({
        allowNull: false
    })
    shipmentType: string;

    @Column({
        allowNull: true
    })
    shipmentTypeText: string;

    @Column({
        allowNull: false
    })
    shipmentHowTo: string;

    @Column({
        allowNull: true
    })
    shipmentHowToText: string;

    @Column({
        allowNull: true
    })
    shipmentdate: Date;

    @Column({
        allowNull: true
    })
    shipmenthour: number;

    @Column({
        allowNull: true
    })
    shipmenthourText: string;

    @Column({
        allowNull: false
    })
    paymentType: string;

    @Column({
        allowNull: true
    })
    paymentTypeText: string;

    @Column({
        allowNull: true
    })
    shipmentInformMe: boolean;    

    @ForeignKey(() => Dispatcher)
    dispatcherid: number;

    @Column({
        allowNull: true
    })
    dispatcherType: string;  

    @Column({
        allowNull: true
    })
    dispatcherName: string;      

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(13, 2)
    })
    dispatcherFee: number;     

    @Column({
        allowNull: true,
        type: DataType.DECIMAL(13, 2)
    })
    dispatchertotalForFree: number;       

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    discountTotal: number;

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    shippingTotal: number;

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    butcherSubTotal: number;    

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    butcherTotal: number;


    @Column({
        allowNull: true
    })
    note: string;

    get productTypeManager() {
        let result = ProductTypeFactory.create(this.productType, {});
        result.loadFromOrderItem(this);
        return result;
    }

    static fromShopcardItem(sc: ShopCard, i: ShopcardItem) {
        let c = new OrderItem();
        c.productid = i.product.id;
        c.price = i.price;
        c.status = OrderItemStatus.supplying;
        c.productName = i.product.name;
        c.kgPrice = i.product.kgPrice;
        c.orderitemnum = orderid.generate();
        c.productType = i.product.productType;
        let prodMan = ProductTypeFactory.create(c.productType, i.productTypeData);
        prodMan.saveToOrderItem(c);
        // c.viewUnit = i.product.viewUnit;
        // c.viewUnitAmount = i.product.viewUnitAmount;
        // c.viewUnitDesc = i.product.viewUnitDesc;
        // c.viewUnitPrice = i.product.viewUnitPrice;
        c.butcherid = i.product.butcher.id;
        c.shipmentHowTo = sc.shipment[c.butcherid].howTo;
        c.shipmentHowToText = sc.shipment[c.butcherid].howToDesc;
        c.paymentType = sc.payment[c.butcherid].type;
        c.paymentTypeText = sc.payment[c.butcherid].desc;
        c.shipmentType = sc.shipment[c.butcherid].type;
        c.shipmentTypeText = sc.shipment[c.butcherid].desc;
        c.shipmentdate = sc.shipment[c.butcherid].days[0] ? new Date(sc.shipment[c.butcherid].days[0]): null;
        c.shipmenthour = sc.shipment[c.butcherid].hours[0];
        c.shipmenthourText = sc.shipment[c.butcherid].hoursText[0];
        c.shipmentInformMe = sc.shipment[c.butcherid].informMe;

        if (sc.shipment[c.butcherid].dispatcher) {
            c.dispatcherid = sc.shipment[c.butcherid].dispatcher.id;
            c.dispatcherFee = sc.shipment[c.butcherid].dispatcher.fee;
            c.dispatcherName = sc.shipment[c.butcherid].dispatcher.name;
            c.dispatcherType = sc.shipment[c.butcherid].dispatcher.type;
            c.dispatchertotalForFree = sc.shipment[c.butcherid].dispatcher.totalForFree;            
        }

        c.quantity = i.quantity;
        c.pounit = i.purchaseoption.unit;
        c.pounitTitle = i.purchaseoption.unitTitle;
        c.pounitWeight = i.purchaseoption.unitWeight;
        c.pounitdesc = i.purchaseoption.desc;
        c.pounitPrice = i.purchaseoption.unitPrice;
        c.pounitkgRatio = i.purchaseoption.kgRatio;
        
        c.discountTotal = sc.getButcherDiscountTotal(c.butcherid);
        c.shippingTotal = sc.getShippingCost(c.butcherid);
        c.butcherTotal = sc.getButcherTotal(c.butcherid);
        c.butcherSubTotal = sc.butchers[c.butcherid].subTotal;
        c.note = i.note;

        return c;
    }

}

export { Order, OrderItem };