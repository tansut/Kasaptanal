"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
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
const router_1 = require("../../lib/router");
const butcher_1 = require("../../db/models/butcher");
const common_1 = require("../../lib/common");
const area_1 = require("../../db/models/area");
const resource_1 = require("../../db/models/resource");
const product_1 = require("../../db/models/product");
const butcherproduct_1 = require("../../db/models/butcherproduct");
const dispatcher_1 = require("../../db/models/dispatcher");
const creditcard_1 = require("../../lib/payment/creditcard");
const sitelog_1 = require("../api/sitelog");
class Route extends router_1.ViewRouter {
    constructor() {
        super(...arguments);
        this.dispatchs = [];
        this.darea1 = [];
        this.darea2 = [];
        this.darea3 = [];
    }
    listViewRoute() {
        return __awaiter(this, void 0, void 0, function* () {
            let butchers = yield butcher_1.default.findAll({
                order: ["name"]
            });
            this.res.render('pages/admin/butcher.list.ejs', this.viewData({ butchers: butchers }));
        });
    }
    getButcher() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield butcher_1.default.findOne({
                include: [{
                        all: true,
                    }], where: { slug: this.req.params.butcher }
            });
        });
    }
    getResources(butcher) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield resource_1.default.findAll({
                where: {
                    type: "butcher-google-photos",
                    ref1: butcher.id
                },
                order: [["displayOrder", "DESC"], ["updatedOn", "DESC"]]
            });
        });
    }
    getProducts() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield product_1.default.findAll({
                include: [{
                        all: true
                    }
                ],
                order: ["Tag1", "Name"],
                where: {}
            });
        });
    }
    getProductUnits(product) {
        let result = [];
        (product.unit1 && product.unit1 != "" && product.unit1 != 'kg') ? result.push(product.unit1) : null;
        (product.unit2 && product.unit2 != "" && product.unit2 != 'kg') ? result.push(product.unit2) : null;
        (product.unit3 && product.unit3 != "" && product.unit3 != 'kg') ? result.push(product.unit3) : null;
        return result;
    }
    getButcherProductInfo(productid) {
        let butcherProduct = this.butcher.products.find(c => c.productid == productid);
        return butcherProduct ? {
            displayOrder: butcherProduct.displayOrder,
            enabled: butcherProduct.enabled,
            product: butcherProduct,
            unit1price: butcherProduct.unit1price,
            unit2price: butcherProduct.unit2price,
            unit3price: butcherProduct.unit3price,
            vitrin: butcherProduct.vitrin,
            kgPrice: butcherProduct.kgPrice,
            mddesc: butcherProduct.mddesc
        } : {
            displayOrder: "",
            enabled: false,
            unit1price: 0,
            unit2price: 0,
            unit3price: 0,
            vitrin: false,
            kgPrice: 0,
            mddesc: ""
        };
    }
    editViewRoute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.req.params.butcher) {
                return this.next();
            }
            this.butcher = yield this.getButcher();
            let resources = yield this.getResources(this.butcher);
            this.products = yield this.getProducts();
            this.dispatchs = yield dispatcher_1.default.findAll({
                where: {
                    butcherId: this.butcher.id
                },
                order: [["toarealevel", "DESC"], ["fee", "ASC"]],
                include: [
                    {
                        all: true
                    }
                ]
            });
            for (let i = 0; i < this.dispatchs.length; i++) {
                this.dispatchs[i].address = yield this.dispatchs[i].toarea.getPreferredAddress();
            }
            let area1 = yield area_1.default.findAll({
                where: {
                    level: 1
                }
            });
            let area2 = yield area_1.default.findAll({
                where: {
                    level: 2,
                    parentid: this.butcher.areaLevel1Id
                }
            });
            let area3 = yield area_1.default.findAll({
                where: {
                    level: 3,
                    parentid: this.butcher.areaLevel2Id
                }
            });
            this.darea1 = yield area_1.default.findAll({
                where: { level: 1 }
            });
            this.res.render('pages/admin/butcher.edit.ejs', this.viewData({ images: resources, area1: area1, area2: area2, area3: area3, butcher: this.butcher }));
        });
    }
    dispatchRoute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.req.params.butcher) {
                return this.next();
            }
            this.butcher = yield this.getButcher();
            this.darea1 = yield area_1.default.findAll({
                where: { level: 1 }
            });
            if (parseInt(this.req.body.dareal1) > 0) {
                this.darea1sel = parseInt(this.req.body.dareal1);
                this.darea2 = yield area_1.default.findAll({
                    where: { level: 2, parentid: parseInt(this.req.body.dareal1) }
                });
            }
            if (parseInt(this.req.body.dareal2) > 0) {
                this.darea2sel = parseInt(this.req.body.dareal2);
                this.darea3 = yield area_1.default.findAll({
                    where: { level: 3, parentid: parseInt(this.req.body.dareal2) }
                });
            }
            if (this.req.body.add == "ilceekle") {
                let l2 = this.darea2.find(p => p.id == parseInt(this.req.body.dareal2));
                let paddr = yield l2.getPreferredAddress();
                let d = new dispatcher_1.default();
                d.toarealevel = 2;
                d.toareaid = parseInt(this.req.body.dareal2);
                d.totalForFree = parseInt(this.req.body.free);
                d.fee = parseInt(this.req.body.fee);
                d.min = parseInt(this.req.body.minsales);
                d.type = 'butcher';
                d.name = this.butcher.name;
                d.butcherid = this.butcher.id;
                d.note = paddr.display;
                d.typeid = 0;
                yield d.save();
            }
            if (this.req.body.add == "semtekle") {
                let l3 = this.darea3.find(p => p.id == parseInt(this.req.body.dareal3));
                let paddr = yield l3.getPreferredAddress();
                let d = new dispatcher_1.default();
                d.toarealevel = 3;
                d.toareaid = parseInt(this.req.body.dareal3);
                d.totalForFree = parseInt(this.req.body.free);
                d.fee = parseInt(this.req.body.fee);
                d.min = parseInt(this.req.body.minsales);
                d.type = 'butcher';
                d.name = this.butcher.name;
                d.butcherid = this.butcher.id;
                d.note = paddr.display;
                d.typeid = 0;
                yield d.save();
            }
            if (this.req.body.delete) {
                let id = parseInt(this.req.body.delete);
                yield dispatcher_1.default.destroy({
                    where: {
                        id: id
                    }
                });
            }
            else if (this.req.body.update) {
                let id = parseInt(this.req.body.update);
                let d = yield dispatcher_1.default.findByPk(id);
                let fee = parseInt(this.req.body['fee' + id.toString()]);
                let free = parseInt(this.req.body['free' + id.toString()]);
                let min = parseInt(this.req.body['min' + id.toString()]);
                let sel = this.req.body['dsel' + id.toString()];
                d.enabled = this.req.body['enabled' + id.toString()] == "on" ? true : false;
                d.takeOnly = this.req.body['takeonly' + id.toString()] == "on" ? true : false;
                d.selection = sel;
                d.fee = fee;
                d.totalForFree = free;
                d.min = min;
                yield d.save();
            }
            this.activetab = "dispatch";
            return this.editViewRoute();
        });
    }
    saveRoute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.req.params.butcher) {
                return this.next();
            }
            this.butcher = yield this.getButcher();
            let resources = yield this.getResources(this.butcher);
            this.products = yield this.getProducts();
            if (this.req.body.saveAsSubMerchant) {
                let logger = new sitelog_1.default(this.constructorParams);
                let payment = creditcard_1.CreditcardPaymentFactory.getInstance();
                payment.logger = logger;
                let subMerchantReq = payment.subMerchantRequestFromButcher(this.butcher);
                let result = yield payment.createSubMerchant(subMerchantReq);
                let k = result.subMerchantKey;
            }
            else if (this.req.body.save == "true") {
                this.butcher.slug = this.req.body.butcherslug;
                this.butcher.name = this.req.body.butchername;
                this.butcher.address = this.req.body.butcheradres;
                this.butcher.phone = this.req.body.butchertel;
                this.butcher.website = this.req.body.butcherweb;
                this.butcher.postal = this.req.body.butcherpostal;
                this.butcher.areaLevel1Id = parseInt(this.req.body.areal1);
                this.butcher.areaLevel2Id = parseInt(this.req.body.areal2);
                this.butcher.areaLevel3Id = parseInt(this.req.body.areal3);
                this.butcher.approved = this.req.body.butcherapproved ? true : false;
                this.butcher.instagram = this.req.body.butcherinstagram;
                this.butcher.videoInstagramStr = this.req.body.butchervideoinstagram;
                this.butcher.facebook = this.req.body.butcherfacebook;
                this.butcher.description = this.req.body.butcherdesc;
                this.butcher.keywords = this.req.body.keywords;
                if (this.req.body.butcherlat && this.req.body.butcherlng) {
                    this.butcher.location = {
                        type: 'Point',
                        coordinates: [parseFloat(this.req.body.butcherlat), parseFloat(this.req.body.butcherlng)]
                    };
                }
                yield this.butcher.save();
                //return this.res.redirect(`/pages/admin/butcher/${this.butcher.slug}`)
            }
            else if (this.req.body.updateproduct == "true") {
                let productid = parseInt(this.req.body.productid);
                let newItem = yield butcherproduct_1.default.findOne({
                    where: {
                        butcherid: this.butcher.id,
                        productid: productid
                    }
                });
                if (newItem == null)
                    newItem = new butcherproduct_1.default();
                newItem.enabled = this.req.body.productenabled == "on";
                newItem.vitrin = this.req.body.productvitrin == "on";
                newItem.butcherid = this.butcher.id;
                newItem.productid = productid;
                newItem.displayOrder = (this.req.body.productdisplayorder ? parseInt(this.req.body.productdisplayorder) : 0);
                newItem.unit1price = this.req.body.unit1price ? parseFloat(this.req.body.unit1price) : 0;
                newItem.unit2price = this.req.body.unit2price ? parseFloat(this.req.body.unit2price) : 0;
                newItem.unit3price = this.req.body.unit3price ? parseFloat(this.req.body.unit3price) : 0;
                newItem.kgPrice = this.req.body.productkgPrice ? parseFloat(this.req.body.productkgPrice) : 0;
                newItem.mddesc = this.req.body.productmddesc;
                yield newItem.save();
                this.butcher = yield this.getButcher();
            }
            else {
                if (parseInt(this.req.body.areal1) != this.butcher.areaLevel1Id)
                    this.butcher.areaLevel1Id = parseInt(this.req.body.areal1);
                if (parseInt(this.req.body.areal2) != this.butcher.areaLevel2Id)
                    this.butcher.areaLevel2Id = parseInt(this.req.body.areal2);
            }
            let area1 = yield area_1.default.findAll({
                where: { level: 1 }
            });
            let area2 = yield area_1.default.findAll({
                where: {
                    level: 2,
                    parentid: this.butcher.areaLevel1Id
                }
            });
            let area3 = yield area_1.default.findAll({
                where: {
                    level: 3,
                    parentid: this.butcher.areaLevel2Id
                }
            });
            this.res.render('pages/admin/butcher.edit.ejs', this.viewData({ images: resources, area1: area1, area2: area2, area3: area3, butcher: this.butcher }));
        });
    }
    static SetRoutes(router) {
        router.get("/butcher/googlesearch", Route.BindToView("pages/admin/butcher.googlesearch.ejs"));
        router.get("/butcher/list", Route.BindRequest(Route.prototype.listViewRoute));
        router.get("/butcher/:butcher", Route.BindRequest(Route.prototype.editViewRoute));
        router.post("/butcher/:butcher", Route.BindRequest(Route.prototype.saveRoute));
        router.post("/butcher/:butcher/dispatch", Route.BindRequest(Route.prototype.dispatchRoute));
    }
}
__decorate([
    common_1.Auth.Anonymous(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Route.prototype, "listViewRoute", null);
__decorate([
    common_1.Auth.Anonymous(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Route.prototype, "editViewRoute", null);
exports.default = Route;