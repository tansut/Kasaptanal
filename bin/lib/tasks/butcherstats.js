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
const basetask_1 = require("./basetask");
const order_1 = require("../../db/models/order");
const sq = require("sequelize");
const order_2 = require("../../models/order");
const butcher_1 = require("../../db/models/butcher");
class ButcherStats extends basetask_1.BaseTask {
    get interval() {
        return "0 0 */9 * * *";
    }
    updateButcher(butcherid, success, fail) {
        return __awaiter(this, void 0, void 0, function* () {
            yield butcher_1.default.update({
                shipTotalCount: fail + success,
                shipFailureCount: fail
            }, {
                where: {
                    id: butcherid
                }
            });
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('running butchers job', Date.now());
            let prods = yield order_1.Order.sequelize.query("SELECT butcherid, status, count(*) as total FROM Orders  group by butcherid, status", {
                type: sq.QueryTypes.SELECT,
                mapToModel: false,
                raw: true
            });
            let rates = yield order_1.Order.sequelize.query("SELECT ref2, avg(userRating1) as avg, count(*) as total FROM Reviews group by ref2;", {
                type: sq.QueryTypes.SELECT,
                mapToModel: false,
                raw: true
            });
            rates.forEach((r) => __awaiter(this, void 0, void 0, function* () {
                yield butcher_1.default.update({
                    userRating: r.avg,
                    userRatingCount: r.total
                }, {
                    where: {
                        id: r.ref2
                    }
                });
            }));
            let lastButcher = null, lastSuccess = 0, lastFail = 0;
            for (var i = 0; i < prods.length; i++) {
                let b = prods[i];
                if (!lastButcher)
                    lastButcher = b.butcherid;
                if (lastButcher != b.butcherid) {
                    yield this.updateButcher(lastButcher, lastSuccess, lastFail);
                    lastButcher = b.butcherid;
                    lastSuccess = 0;
                    lastFail = 0;
                }
                if (b.status == order_2.OrderItemStatus.success) {
                    lastSuccess += b.total;
                }
                else if ((b.status == order_2.OrderItemStatus.butcherCannotProvide) || (b.status == order_2.OrderItemStatus.butcherCannotShip)) {
                    lastFail += b.total;
                }
                else {
                }
            }
            ;
            if (lastButcher) {
                yield this.updateButcher(lastButcher, lastSuccess, lastFail);
            }
            console.log('done butchers job', Date.now());
            // console.log('stats start');
            // return new Promise((resolve, reject) => {
            //     setTimeout(() => {
            //         console.log('completed');
            //         resolve()
            //     }, 250);
            // })
        });
    }
}
exports.default = ButcherStats;