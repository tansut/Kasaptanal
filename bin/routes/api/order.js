"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../lib/common");
const router_1 = require("../../lib/router");
const order_1 = require("../../db/models/order");
const area_1 = require("../../db/models/area");
const email_1 = require("../../lib/email");
const shipment_1 = require("../../models/shipment");
const dispatcher_1 = require("../../db/models/dispatcher");
const payment_1 = require("../../models/payment");
const butcher_1 = require("../../db/models/butcher");
const accountmodel_1 = require("../../db/models/accountmodel");
const product_1 = require("../../db/models/product");
const order_2 = require("../api/order");
const sitelog_1 = require("../api/sitelog");
const context_1 = require("../../db/context");
const sms_1 = require("../../lib/sms");
const account_1 = require("../../models/account");
const helper_1 = require("../../lib/helper");
const creditcard_1 = require("../../lib/payment/creditcard");
const order_3 = require("../../models/order");
const config_1 = require("../../config");
const commissionHelper_1 = require("../../lib/commissionHelper");
const sequelize_1 = require("sequelize");
const orderid = require('order-id')('dkfjsdklfjsdlkg450435034.,');
class Route extends router_1.ApiRouter {
    getButcherPuanAccounts(o) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = [
                account_1.Account.generateCode("musteri-kasap-kazanilan-puan", [o.userId, o.butcherid, o.ordernum])
            ];
            let accounts = yield accountmodel_1.default.list(list);
            return accounts;
        });
    }
    getButcherPuanAccountsSummary(o) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = [
                account_1.Account.generateCode("musteri-kasap-kazanilan-puan", [o.userId, o.butcherid, o.ordernum])
            ];
            let accounts = yield accountmodel_1.default.summary(list);
            return accounts;
        });
    }
    fillButcherDebtAccounts(o) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = [
                account_1.Account.generateCode("kasaplardan-alacaklar", [o.butcherid, 1, o.ordernum]),
                account_1.Account.generateCode("kasaplardan-alacaklar", [o.butcherid, 2, o.ordernum]),
                account_1.Account.generateCode("kasap-borc-tahakkuk", [1, o.butcherid, o.ordernum])
            ];
            let accounts = yield accountmodel_1.default.list(list);
            o.butcherDeptAccounts = accounts;
            return accounts;
        });
    }
    getKalittePuanAccounts(o) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = [
                account_1.Account.generateCode("musteri-kalitte-kazanilan-puan", [o.userId, 1, o.ordernum]),
                account_1.Account.generateCode("musteri-kalitte-kazanilan-puan", [o.userId, 2, o.ordernum])
            ];
            let accounts = yield accountmodel_1.default.list(list);
            return accounts;
        });
    }
    getKalittePuanAccountsSummary(o) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = [
                account_1.Account.generateCode("musteri-kalitte-kazanilan-puan", [o.userId, 1, o.ordernum]),
                account_1.Account.generateCode("musteri-kalitte-kazanilan-puan", [o.userId, 2, o.ordernum])
            ];
            let accounts = yield accountmodel_1.default.summary(list);
            return accounts;
        });
    }
    getWorkingAccounts(o) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = [
                account_1.Account.generateCode("odeme-bekleyen-satislar", [o.userId, o.ordernum]),
                account_1.Account.generateCode("satis-indirimleri", [o.userId, o.ordernum])
            ];
            let accounts = yield accountmodel_1.default.list(list);
            return accounts;
        });
    }
    getAccountsSummary(o) {
        return __awaiter(this, void 0, void 0, function* () {
            let list = [
                account_1.Account.generateCode("odeme-bekleyen-satislar", [o.userId, o.ordernum]),
                account_1.Account.generateCode("satis-indirimleri", [o.userId, o.ordernum])
            ];
            let accounts = yield accountmodel_1.default.summary(list);
            return accounts;
        });
    }
    calculatePaid(o) {
        let codeCredit = account_1.Account.generateCode("odeme-bekleyen-satislar", [o.userId, o.ordernum, 500]);
        let codeManual = account_1.Account.generateCode("odeme-bekleyen-satislar", [o.userId, o.ordernum, 600]);
        let total = 0.00;
        o.workedAccounts.forEach(a => {
            if (a.code == codeCredit || a.code == codeManual)
                total += a.borc;
        });
        return helper_1.default.asCurrency(total);
    }
    calculateTeslimat(o) {
        let code = account_1.Account.generateCode("odeme-bekleyen-satislar", [o.userId, o.ordernum, 200]);
        let total = 0.00;
        o.workedAccounts.forEach(a => {
            if (a.code == code)
                total += a.alacak;
        });
        return helper_1.default.asCurrency(total);
    }
    calculateProduct(o) {
        let code = account_1.Account.generateCode("odeme-bekleyen-satislar", [o.userId, o.ordernum, 100]);
        let total = 0.00;
        o.workedAccounts.forEach(a => {
            if (a.code == code)
                total += a.alacak;
        });
        return helper_1.default.asCurrency(total);
    }
    getOrders(where) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield order_1.Order.findAll({
                where: where,
                order: [['ID', 'DESC']],
                limit: 100,
                include: [{
                        model: butcher_1.default
                    }, {
                        model: order_1.OrderItem,
                        include: [{
                                model: butcher_1.default,
                                all: true
                            }, {
                                model: product_1.default,
                                all: true
                            }]
                    }]
            });
            return res;
        });
    }
    arrangeKalittePuans(o) {
        o.kalitteOnlyPuanAccounts = [];
        o.kalitteByButcherPuanAccounts = [];
        let kalitteCode = account_1.Account.generateCode("musteri-kalitte-kazanilan-puan", [o.userId, 1, o.ordernum]);
        let kalitteByButcherCode = account_1.Account.generateCode("musteri-kalitte-kazanilan-puan", [o.userId, 2, o.ordernum]);
        o.kalittePuanAccounts.forEach(a => {
            if (a.code == kalitteCode) {
                o.kalitteOnlyPuanAccounts.push(a);
            }
            else if (a.code == kalitteByButcherCode) {
                o.kalitteByButcherPuanAccounts.push(a);
            }
        });
        accountmodel_1.default.addTotals(o.kalitteOnlyPuanAccounts);
        accountmodel_1.default.addTotals(o.kalitteByButcherPuanAccounts);
    }
    getOrder(num, checkFirst = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let order = yield order_1.Order.findOne({
                where: {
                    ordernum: num
                },
                include: [{
                        model: butcher_1.default
                    }, {
                        model: order_1.OrderItem,
                        include: [{
                                model: butcher_1.default,
                                all: true
                            }, {
                                model: product_1.default,
                                all: true
                            }]
                    }]
            });
            order.workedAccounts = yield this.getWorkingAccounts(order);
            order.butcherPuanAccounts = yield this.getButcherPuanAccounts(order);
            order.kalittePuanAccounts = yield this.getKalittePuanAccounts(order);
            this.arrangeKalittePuans(order);
            if (checkFirst) {
                order.isFirstButcherOrder = (yield order_1.Order.findOne({ where: { userid: order.userId, butcherid: order.butcherid, status: order_3.OrderItemStatus.success, ordernum: { [sequelize_1.Op.ne]: order.ordernum } } })) == null;
                order.isFirstOrder = (yield order_1.Order.findOne({ where: { userid: order.userId } })) == null;
            }
            return order;
        });
    }
    completeOrderStatus(o, newStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = context_1.default.getContext().transaction((t) => {
                return this.changeOrderStatus(o, newStatus, t);
            });
            yield res;
        });
    }
    changeOrderStatus(o, newStatus, t) {
        return __awaiter(this, void 0, void 0, function* () {
            let promises = [], ops = [];
            if (o.status != newStatus) {
                if (newStatus.startsWith('iptal') && o.status.startsWith('iptal')) {
                }
                else {
                    if (newStatus.startsWith('iptal')) {
                        let summary = yield this.getAccountsSummary(o);
                        let balance = helper_1.default.asCurrency(summary.alacak - summary.borc);
                        if (balance > 0.00) {
                            let op = new account_1.AccountingOperation(`${o.ordernum} iptali`);
                            op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [o.userId, o.ordernum]).dec(balance));
                            op.accounts.push(new account_1.Account("satis-alacaklari", [o.userId, o.ordernum]).dec(balance));
                            ops.push(op);
                        }
                        o.items.forEach(oi => {
                            if (!oi.status.startsWith('iptal')) {
                                oi.status = newStatus;
                                promises.push(oi.save({ transaction: t }));
                            }
                        });
                    }
                    else if (o.status.startsWith('iptal')) {
                    }
                    else {
                        o.items.forEach(oi => {
                            if (!oi.status.startsWith('iptal')) {
                                oi.status = newStatus;
                                promises.push(oi.save({ transaction: t }));
                            }
                        });
                    }
                }
                yield this.saveAccountingOperations(ops, t);
                o.status = newStatus;
                yield o.save({ transaction: t });
            }
        });
    }
    completeOrderItemStatus(oi, newStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = context_1.default.getContext().transaction((t) => {
                return this.changeOrderItemStatus(oi, newStatus, t);
            });
            yield res;
        });
    }
    changeOrderItemStatus(oi, newStatus, t) {
        let promises = [], ops = [];
        if (oi.status != newStatus) {
            if (newStatus.startsWith('iptal') && oi.status.startsWith('iptal')) {
            }
            else {
                if (newStatus.startsWith('iptal')) {
                    let op = new account_1.AccountingOperation(`${oi.productName} ${newStatus}`);
                    op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [oi.order.userId, oi.order.ordernum]).dec(oi.price));
                    op.accounts.push(new account_1.Account("satis-alacaklari", [oi.order.userId, oi.order.ordernum]).dec(oi.price));
                    ops.push(op);
                }
                else if (oi.status.startsWith('iptal')) {
                    let op = new account_1.AccountingOperation(`${oi.productName} iptalin iptali`);
                    op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [oi.order.userId, oi.order.ordernum]).inc(oi.price));
                    op.accounts.push(new account_1.Account("satis-alacaklari", [oi.order.userId, oi.order.ordernum]).inc(oi.price));
                    ops.push(op);
                }
            }
            promises.push(this.saveAccountingOperations(ops, t));
            oi.status = newStatus;
            promises.push(oi.save({ transaction: t }));
        }
        return Promise.all(promises);
    }
    getView(order) {
        let shipment = {};
        let payment = {};
        let butchers = {};
        order.items.forEach((item, i) => {
            let bi = item.butcher.id;
            let prodMan = common_1.ProductTypeFactory.create(item.productType, {});
            prodMan.loadFromOrderItem(item);
            if (!butchers[bi]) {
                butchers[bi] = item.butcher;
                butchers[bi].products = [i];
                butchers[bi].subTotal = item.butcherSubTotal;
                butchers[bi].total = item.butcherTotal;
                butchers[bi].discountTotal = item.discountTotal;
                butchers[bi].shippingTotal = item.shippingTotal;
            }
            else {
                butchers[bi].products.push(i);
            }
            if (!shipment[bi])
                shipment[bi] = Object.assign(new shipment_1.Shipment(), {
                    howTo: item.shipmentHowTo,
                    type: item.shipmentType,
                    days: [item.shipmentdate ? item.shipmentdate.toDateString() : ''],
                    hours: [item.shipmenthour],
                    informMe: item.shipmentInformMe,
                    daysText: [[item.shipmentdate ? item.shipmentdate.toDateString() : '']],
                    hoursText: [item.shipmenthourText],
                });
            if (item.dispatcherid) {
                shipment[bi].dispatcher = Object.assign(new dispatcher_1.default(), {
                    id: item.dispatcherid,
                    type: item.dispatcherType,
                    name: item.dispatcherName,
                    fee: item.dispatcherFee,
                    location: order.dispatcherLocation,
                    totalForFree: item.dispatchertotalForFree
                });
            }
            if (!payment[bi])
                payment[bi] = Object.assign(new payment_1.Payment(), {
                    type: item.paymentType,
                    desc: item.paymentTypeText
                });
        });
        return {
            order: order,
            butchers: butchers,
            shipment: shipment,
            payment: payment,
            items: order.items
        };
    }
    createOrder(t, order, card) {
        return order.save({
            transaction: t
        }).then((order) => {
            let promises = [];
            let butcher = card.butchers[order.butcherid];
            butcher.products.forEach((pi, i) => {
                let item = card.items[pi];
                let oi = order_1.OrderItem.fromShopcardItem(card, item);
                oi.orderid = order.id;
                promises.push(oi.save({
                    transaction: t
                }));
            });
            if (card.address.saveaddress) {
                this.req.user.lastAddress = card.address.adres;
                promises.push(this.req.user.save());
            }
            return Promise.all(promises);
        }).then((orderItems) => {
            let promises = [];
            orderItems.forEach(oi => {
                if (oi.dispatcherid) {
                    promises.push(dispatcher_1.default.update({
                        lastorderitemid: oi.id
                    }, {
                        transaction: t,
                        where: {
                            id: oi.dispatcherid
                        }
                    }));
                }
            });
            return Promise.all(promises);
        });
    }
    getPreAccountingOperations(ol, paymentInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = [];
            if (paymentInfo) {
                let remaining = paymentInfo.paid;
                for (let i = 0; i < ol.length; i++) {
                    let o = ol[i];
                    let total = helper_1.default.asCurrency(o.total);
                    remaining = helper_1.default.asCurrency(remaining - total);
                    if (remaining >= 0.00) {
                        let op = new account_1.AccountingOperation(`${o.name} ${o.ordernum} siparişi ön provizyon ödeme işlemi`);
                        op.accounts.push(new account_1.Account("kredi-karti-provizyon", [o.userId, o.ordernum, paymentInfo.paymentId]).inc(total));
                        op.accounts.push(new account_1.Account("havuz-hesabi", [o.userId, o.ordernum, paymentInfo.paymentId]).inc(total));
                        op.validate();
                        result.push(op);
                    }
                }
            }
            return result;
        });
    }
    saveAccountingOperations(ops, t) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = [];
            if (t) {
                for (var i = 0; i < ops.length; i++) {
                    ops[i].validate();
                    result.push(accountmodel_1.default.saveOperation(ops[i], {
                        transaction: t
                    }));
                }
                return Promise.all(result);
            }
            else {
                let res = context_1.default.getContext().transaction((t) => {
                    for (var i = 0; i < ops.length; i++) {
                        ops[i].validate();
                        result.push(accountmodel_1.default.saveOperation(ops[i], {
                            transaction: t
                        }));
                    }
                    return Promise.all(result);
                });
                yield res;
            }
        });
    }
    updateOrderByCreditcardPayment(o, paymentInfo, t) {
        return __awaiter(this, void 0, void 0, function* () {
            let promises = [];
            o.paymentId = paymentInfo.paymentId;
            o.paymentType = "onlinepayment";
            o.paymentTypeText = payment_1.PaymentTypeDesc.onlinepayment;
            promises.push(o.save({
                transaction: t
            }));
            paymentInfo.itemTransactions.forEach(it => {
                // let oi = o.items.find(p => p.orderitemnum == it.itemId);
                // if (oi) {
                //     oi.paymentTransactionId = it.paymentTransactionId
                //     oi.paidPrice = it.paidPrice;
                //     promises.push(oi.save({ transaction: t }))
                // }
                if (it.itemId == o.ordernum) {
                    o.paymentTransactionId = it.paymentTransactionId;
                    o.paidTotal = it.paidPrice;
                    promises.push(o.save({ transaction: t }));
                }
            });
            return o.isNewRecord ? null : Promise.all(promises);
        });
    }
    completeManualPaymentDept(o, customerPuan, butcherDebt) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = context_1.default.getContext().transaction((t) => {
                return this.createManualPaymentDept(o, customerPuan, butcherDebt);
            });
            yield res;
        });
    }
    createManualPaymentDept(o, customerPuan, butcherDebt, t) {
        return __awaiter(this, void 0, void 0, function* () {
            // let puan = this.getPossiblePuanGain(o, total);
            // let calc = new ComissionHelper(this.order.butcher.commissionRate, this.order.butcher.commissionFee);
            // this.butcherFee = calc.calculateButcherComission(this.paid);   
            let result = new account_1.AccountingOperation(`${o.ordernum} nolu ${o.butcherName} siparişi kasaptan alacak`);
            result.accounts.push(new account_1.Account("kasaplardan-alacaklar", [o.butcherid, 1, o.ordernum], `${o.ordernum} nolu sipariş komisyonu`).inc(butcherDebt));
            result.accounts.push(new account_1.Account("kasaplardan-alacaklar", [o.butcherid, 2, o.ordernum], `${o.ordernum} nolu sipariş müşteriye iletilen`).inc(customerPuan));
            result.accounts.push(new account_1.Account("kasap-borc-tahakkuk", [1, o.butcherid, o.ordernum], `${o.ordernum} nolu sipariş ödemesi`).inc(helper_1.default.asCurrency(butcherDebt + customerPuan)));
            return this.saveAccountingOperations([result], t);
        });
    }
    completeCreditcardPayment(ol, paymentRequest, paymentInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = context_1.default.getContext().transaction((t) => {
                return this.makeCreditcardPayment(ol, paymentRequest, paymentInfo, t);
            });
            yield new Promise((resolve, reject) => {
                res.then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        });
    }
    getPossiblePuanGain(o, total, includeAvailable = false) {
        let calculator = new commissionHelper_1.PuanCalculator();
        let result = [];
        let firstOrder = {
            minPuanForUsage: 0.00,
            minSales: 0.00,
            name: 'ilk sipariş indirimi',
            rate: 0.03
        };
        if (o.butcher.enableCreditCard) {
            if (o.isFirstButcherOrder) {
                let firstOrderPuan = calculator.calculateCustomerPuan(firstOrder, total);
                if (firstOrderPuan > 0.00 || includeAvailable) {
                    result.push({
                        type: "kalitte-by-butcher",
                        earned: firstOrderPuan,
                        id: o.butcherid.toString(),
                        title: `Kasap Kart™ programı ilk sipariş puanı`,
                        desc: `${o.ordernum} nolu ${o.butcherName} siparişi kasaptanAl.com Puan`,
                        based: firstOrder
                    });
                }
            }
            if (o.butcher.enablePuan) {
                let butcherPuan = o.butcher.getPuanData();
                let earnedPuanb = calculator.calculateCustomerPuan(butcherPuan, total);
                if (earnedPuanb > 0.00 || includeAvailable) {
                    if (earnedPuanb == 0) {
                        result.push({
                            type: "butcher",
                            earned: earnedPuanb,
                            id: o.butcherid.toString(),
                            title: o.butcher.name + ' Kasap Kart™ programı',
                            desc: `${o.ordernum} nolu ${o.butcherName} sipariş Kasap Puan`,
                            based: butcherPuan
                        });
                    }
                    else {
                        let toKalitte = helper_1.default.asCurrency(earnedPuanb * 0.2);
                        let toButcher = helper_1.default.asCurrency(earnedPuanb - toKalitte);
                        if (toButcher > 0.00) {
                            result.push({
                                type: "butcher",
                                earned: toButcher,
                                id: o.butcherid.toString(),
                                title: o.butcher.name + ' Kasap Kart™ programı',
                                desc: `${o.ordernum} nolu ${o.butcherName} sipariş Kasap Puan`,
                                based: butcherPuan
                            });
                        }
                        if (toKalitte > 0.00) {
                            result.push({
                                type: "kalitte-by-butcher",
                                earned: toKalitte,
                                id: o.butcherid.toString(),
                                title: `kasaptanAl.com Kasap Kart™ programı`,
                                desc: `${o.ordernum} nolu ${o.butcherName} sipariş kasaptanAl.com Puan`,
                                based: butcherPuan
                            });
                        }
                    }
                }
            }
        }
        // if (o.isFirstOrder) {
        //     let earnedPuan = calculator.calculateCustomerPuan({
        //         minPuanForUsage: 0.00,
        //         minSales: 0.00,
        //         name:'kalitte ilk sipariş',
        //         rate: 0.01
        //     }, total);
        //     if (earnedPuan > 0.00) {
        //         result.push(
        //             {
        //                 type:"kalitte",
        //                 desc: `${o.ordernum} kasaptanAl.com ilk sipariş kazanılan puan bedeli `,
        //                 earned: earnedPuan,
        //                 id: 'kasaptanAl.com',
        //                 title: 'kasaptanAl.com ilk sipariş hediye puanı'
        //             }
        //         )                
        //     }
        // } 
        return result;
    }
    getPuanAccounts(o, total) {
        let gains = this.getPossiblePuanGain(o, total);
        let result = new account_1.AccountingOperation(`${o.ordernum} nolu ${o.butcherName} siparişi puan kazancı`);
        gains.forEach(pg => {
            if (pg.earned > 0.00) {
                if (pg.type == "butcher") {
                    result.accounts.push(new account_1.Account("kasap-puan-giderleri", [o.butcherid, o.userId, o.ordernum], pg.title).inc(pg.earned));
                    result.accounts.push(new account_1.Account("musteri-kasap-kazanilan-puan", [o.userId, o.butcherid, o.ordernum], pg.title).inc(pg.earned));
                }
                if (pg.type == "kalitte") {
                    result.accounts.push(new account_1.Account("kalitte-puan-giderleri", [o.userId, 1, o.ordernum], pg.title).inc(pg.earned));
                    result.accounts.push(new account_1.Account("musteri-kalitte-kazanilan-puan", [o.userId, 1, o.ordernum], pg.title).inc(pg.earned));
                }
                if (pg.type == "kalitte-by-butcher") {
                    result.accounts.push(new account_1.Account("kalitte-puan-giderleri", [o.userId, 2, o.ordernum], pg.title).inc(pg.earned));
                    result.accounts.push(new account_1.Account("musteri-kalitte-kazanilan-puan", [o.userId, 2, o.ordernum], pg.title).inc(pg.earned));
                }
            }
        });
        return result;
    }
    fillPuanAccounts(o, paidPrice) {
        o.butcherPuanAccounts = [];
        o.kalittePuanAccounts = [];
        o.kalitteOnlyPuanAccounts = [];
        o.kalitteByButcherPuanAccounts = [];
        let accounts = this.getPuanAccounts(o, paidPrice).accounts;
        let butcherCode = account_1.Account.generateCode("musteri-kasap-kazanilan-puan", [o.userId, o.butcherid, o.ordernum]);
        let kalitteCode = account_1.Account.generateCode("musteri-kalitte-kazanilan-puan", [o.userId, 1, o.ordernum]);
        let kalitteByButcherCode = account_1.Account.generateCode("musteri-kalitte-kazanilan-puan", [o.userId, 2, o.ordernum]);
        accounts.forEach(a => {
            let acc = accountmodel_1.default.fromAccount(a);
            if (a.code == butcherCode) {
                o.butcherPuanAccounts.push(acc);
            }
            else if (a.code == kalitteCode) {
                o.kalittePuanAccounts.push(acc);
            }
            else if (a.code == kalitteByButcherCode) {
                o.kalittePuanAccounts.push(acc);
            }
        });
        this.arrangeKalittePuans(o);
        accountmodel_1.default.addTotals(o.butcherPuanAccounts);
        accountmodel_1.default.addTotals(o.kalittePuanAccounts);
    }
    loadPuan(o, total, t) {
        return __awaiter(this, void 0, void 0, function* () {
            let ops = [];
            let promises = [];
            let puanAccounts = this.getPuanAccounts(o, total);
            ops.push(puanAccounts);
            promises = promises.concat(this.saveAccountingOperations(ops, t));
            return Promise.all(promises);
        });
    }
    completeManuelPayment(o, total) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = context_1.default.getContext().transaction((t) => {
                return this.makeManuelPayment(o, total, t);
            });
            yield new Promise((resolve, reject) => {
                res.then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        });
    }
    completeLoadPuan(o, total) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = context_1.default.getContext().transaction((t) => {
                return this.loadPuan(o, total, t);
            });
            yield new Promise((resolve, reject) => {
                res.then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            });
        });
    }
    makeManuelPayment(o, total, t) {
        return __awaiter(this, void 0, void 0, function* () {
            let ops = [];
            let promises = [];
            let paymentId = "manuel";
            let op = new account_1.AccountingOperation(`${o.ordernum} ödemesi - ${paymentId}`);
            op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [o.userId, o.ordernum, 600]).dec(total));
            op.accounts.push(new account_1.Account("satis-alacaklari", [o.userId, o.ordernum]).dec(total));
            ops.push(op);
            o.paidTotal = total;
            promises.push(o.save({
                transaction: t
            }));
            promises = promises.concat(this.saveAccountingOperations(ops, t));
            return Promise.all(promises);
        });
    }
    updateButcherDebtAfterPayment(o, paymentRequest, paymentInfo, t) {
        return __awaiter(this, void 0, void 0, function* () {
            let promises = [];
            for (let i = 0; i < paymentInfo.itemTransactions.length; i++) {
                let it = paymentInfo.itemTransactions[i];
                if (it.itemId == o.ordernum) {
                    let req = paymentRequest.basketItems.find(pr => pr.id == o.ordernum);
                    if (req.merchantDebtApplied) {
                        let result = new account_1.AccountingOperation(`${o.ordernum} nolu ${o.butcherName} siparişi düşülen borç`);
                        result.accounts.push(new account_1.Account("kasaplardan-alacaklar", [o.butcherid, 5], `${o.ordernum} nolu sipariş düşülen tutar`).dec(req.merchantDebtApplied));
                        result.accounts.push(new account_1.Account("kasap-borc-tahakkuk", [1, o.butcherid, o.ordernum], `${o.ordernum} nolu siparişten düşülen ödemesi`).dec(req.merchantDebtApplied));
                        promises = promises.concat(this.saveAccountingOperations([result], t));
                    }
                }
            }
            return promises;
        });
    }
    makeCreditcardPayment(ol, paymentRequest, paymentInfo, t) {
        return __awaiter(this, void 0, void 0, function* () {
            let ops = [];
            let promises = [];
            for (let i = 0; i < ol.length; i++) {
                let o = ol[i];
                let op = new account_1.AccountingOperation(`${o.ordernum} kredi kartı ödemesi - ${paymentInfo.paymentId}`);
                if (o.orderSource == order_3.OrderSource.butcher) {
                    op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [o.userId, o.ordernum, 1000]).dec(paymentInfo.paidPrice));
                    op.accounts.push(new account_1.Account("satis-alacaklari", [o.userId, o.ordernum]).dec(paymentInfo.paidPrice));
                    ops.push(op);
                    promises = promises.concat(this.updateOrderByCreditcardPayment(o, paymentInfo, t));
                }
                else {
                    op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [o.userId, o.ordernum, 500]).dec(paymentInfo.paidPrice));
                    op.accounts.push(new account_1.Account("satis-alacaklari", [o.userId, o.ordernum]).dec(paymentInfo.paidPrice));
                    ops.push(op);
                    let puanAccounts = this.getPuanAccounts(o, paymentInfo.paidPrice);
                    ops.push(puanAccounts);
                    promises = promises.concat(this.updateOrderByCreditcardPayment(o, paymentInfo, t));
                    promises = promises.concat(this.updateButcherDebtAfterPayment(o, paymentRequest, paymentInfo, t));
                }
            }
            promises = promises.concat(this.saveAccountingOperations(ops, t));
            for (let i = 0; i < ol.length; i++) {
                let notifyMobilePhones = (ol[i].butcher.notifyMobilePhones || "").split(',');
                if (config_1.default.nodeenv == 'production') {
                    email_1.default.send(ol[i].email, "siparişinizin ödemesi yapıldı", "order.paid.ejs", this.getView(ol[i]));
                }
                if (config_1.default.nodeenv == 'production') {
                    for (var p = 0; p < notifyMobilePhones.length; p++) {
                        if (notifyMobilePhones[p].trim()) {
                            let payUrl = `${this.url}/pay/${ol[i].ordernum}`;
                            sms_1.Sms.send("90" + helper_1.default.getPhoneNumber(notifyMobilePhones[p].trim()), `Tebrikler, ${ol[i].name} ${helper_1.default.formattedCurrency(paymentInfo.paidPrice)} kasabınıza online odeme yapti. Bilgi icin ${payUrl} `, false, new sitelog_1.default(this.constructorParams));
                        }
                    }
                }
            }
            return Promise.all(promises);
        });
    }
    generateInitialAccounting(o) {
        let op = new account_1.AccountingOperation(`${o.ordernum} numaralı sipariş`);
        if (o.orderSource == order_3.OrderSource.butcher) {
            op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [o.userId, o.ordernum, 200], "Sipariş Bedeli").inc(o.subTotal));
            op.accounts.push(new account_1.Account("satis-alacaklari", [o.userId, o.ordernum]).inc(o.total));
        }
        else {
            op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [o.userId, o.ordernum, 100], "Ürün Bedeli").inc(o.subTotal));
            if (o.shippingTotal > 0.00) {
                op.accounts.push(new account_1.Account("odeme-bekleyen-satislar", [o.userId, o.ordernum, 200], "Teslimat Bedeli").inc(o.shippingTotal));
            }
            if (Math.abs(o.discountTotal) > 0.00) {
                op.accounts.push(new account_1.Account("satis-indirimleri", [o.userId, o.ordernum, 100], "Uygulanan İndirimler").inc(Math.abs(o.discountTotal)));
            }
            op.accounts.push(new account_1.Account("satis-alacaklari", [o.userId, o.ordernum]).inc(o.total));
        }
        op.validate();
        return op;
        return;
        // op.accounts.push(new Account("kredi-karti-provizyon", [o.userId, o.ordernum]).inc(total))
        // op.accounts.push(new Account("havuz-hesabi", [o.userId, o.ordernum]).inc(total))
        // let kasapKarOran = 0.10;
        // let kasapPuanOran = 0.2;
        // let odemeSirketiKomisyonOran = 0.032;
        // let kalittePuanOran = 0.00;
        // let musteriIadeToplam = Helper.asCurrency(total * 0.05);
        // let gerceklesenSatisToplam = Helper.asCurrency(total - musteriIadeToplam);
        // let kasapSatisToplam = Helper.asCurrency(gerceklesenSatisToplam * (1.00 - kasapKarOran));
        // let kasapPuanToplam = Helper.asCurrency(gerceklesenSatisToplam * kasapPuanOran);
        // let kasapUrunToplam = Helper.asCurrency(kasapSatisToplam - kasapPuanToplam);
        // let kalittePuanToplam = Helper.asCurrency(gerceklesenSatisToplam * kalittePuanOran);
        // let odemeSirketiKomisyonToplam = Helper.asCurrency(gerceklesenSatisToplam * odemeSirketiKomisyonOran);
        // let netKar = Helper.asCurrency(gerceklesenSatisToplam - kalittePuanToplam - kasapPuanToplam - kasapUrunToplam - odemeSirketiKomisyonToplam);
        // op.accounts.push(new Account("kredi-karti-provizyon", [o.userId, o.ordernum]).dec(gerceklesenSatisToplam))
        // op.accounts.push(new Account("havuz-hesabi", [o.userId, o.ordernum]).dec(total))
        // op.accounts.push(new Account("kredi-karti-provizyon-iade", [o.userId, o.ordernum]).inc(musteriIadeToplam))
        // op.accounts.push(new Account("kredi-karti-odemeleri", [o.userId, o.ordernum]).inc(gerceklesenSatisToplam))
        // op.accounts.push(new Account("banka", [o.userId, o.ordernum]).inc(netKar))
        // op.accounts.push(new Account("kasap-puan-giderleri", [o.userId, o.ordernum]).inc(kasapPuanToplam))
        // op.accounts.push(new Account("kasap-urun-giderleri", [o.userId, o.ordernum]).inc(kasapUrunToplam))
        // kalittePuanToplam > 0 ? op.accounts.push(new Account("kalitte-puan-giderleri", [o.userId, o.ordernum]).inc(kalittePuanToplam)) : null;
        // op.accounts.push(new Account("odeme-sirketi-giderleri", [o.userId, o.ordernum]).inc(odemeSirketiKomisyonToplam))
        // op.validate()
        // return op;
    }
    getFromShopcard(card) {
        return __awaiter(this, void 0, void 0, function* () {
            let butchers = card.butchers;
            let groupid = orderid.generate();
            let l3 = yield area_1.default.findByPk(card.address.level3Id);
            let l2 = l3 ? yield area_1.default.findByPk(l3.parentid) : null;
            let orders = [];
            let payment = creditcard_1.CreditcardPaymentFactory.getInstance();
            let log = new sitelog_1.default(this.constructorParams);
            payment.logger = log;
            for (var bi in butchers) {
                let order = yield order_1.Order.fromShopcard(card, bi);
                order.ordergroupnum = groupid;
                order.butcherid = parseInt(bi);
                order.butcher = yield butcher_1.default.findByPk(order.butcherid);
                order.butcherName = butchers[bi].name;
                order.userId = this.req.user ? this.req.user.id : 0;
                if (!order.userId) {
                    order.isFirstButcherOrder = true;
                    order.isFirstOrder = true;
                }
                order.areaLevel2Id = l2 && l2.id;
                order.areaLevel2Text = l2 && l2.name;
                orders.push(order);
            }
            return orders;
        });
    }
    createAsButcherOrder(o) {
        return __awaiter(this, void 0, void 0, function* () {
            o.orderSource = "butcher";
            o.ordernum = orderid.generate();
            let result = [];
            let res = context_1.default.getContext().transaction((t) => {
                result.push(o.save({
                    transaction: t
                }));
                let accOperation = this.generateInitialAccounting(o);
                result.push(this.saveAccountingOperations([accOperation], t));
                return Promise.all(result);
            });
            yield res;
            return o;
        });
    }
    create(card) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = [];
            let orders = yield this.getFromShopcard(card);
            let res = context_1.default.getContext().transaction((t) => {
                for (var i = 0; i < orders.length; i++) {
                    let dbOrder = this.createOrder(t, orders[i], card);
                    let accOperation = this.generateInitialAccounting(orders[i]);
                    result.push(dbOrder);
                    result.push(accountmodel_1.default.saveOperation(accOperation, {
                        transaction: t
                    }));
                }
                return Promise.all(result);
            });
            yield res;
            let fres = [];
            for (var oi = 0; oi < orders.length; oi++) {
                let order = orders[oi];
                let api = new order_2.default(this.constructorParams);
                let dbOrder = yield api.getOrder(order.ordernum);
                let view = this.getView(dbOrder);
                yield email_1.default.send(dbOrder.email, "siparişinizi aldık", "order.started.ejs", view);
                yield sms_1.Sms.send(dbOrder.phone, 'kasaptanAl.com siparisinizi aldik, destek tel/whatsapp: 08503054216. Urunleriniz hazir oldugunda sizi bilgilendirecegiz.', false, new sitelog_1.default(this.constructorParams));
                fres.push(dbOrder);
            }
            return fres;
        });
    }
    getOrderRoute() {
        return __awaiter(this, void 0, void 0, function* () {
            let order = yield this.getOrder(this.req.params.ordernum);
            if (!order)
                return this.next();
            let view = this.getView(order);
            this.res.send(view);
        });
    }
    static SetRoutes(router) {
        //router.get("/admin/order/:ordernum", Route.BindRequest(this.prototype.getOrderRoute));
    }
}
exports.default = Route;