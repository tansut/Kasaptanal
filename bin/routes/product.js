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
const router_1 = require("../lib/router");
const product_1 = require("../db/models/product");
const common_1 = require("../lib/common");
const resource_1 = require("../db/models/resource");
const resource_2 = require("./resource");
const Jimp = require('jimp');
const category_1 = require("../db/models/category");
const butcher_1 = require("../db/models/butcher");
const product_2 = require("./api/product");
const dispatcher_1 = require("./api/dispatcher");
const area_1 = require("../db/models/area");
const butcherproduct_1 = require("../db/models/butcherproduct");
const dispatcher_2 = require("../db/models/dispatcher");
var MarkdownIt = require('markdown-it');
const shopcard_1 = require("../models/shopcard");
const config_1 = require("../config");
const sequelize_1 = require("sequelize");
const productcategory_1 = require("../db/models/productcategory");
const commissionHelper_1 = require("../lib/commissionHelper");
class Route extends router_1.ViewRouter {
    constructor() {
        super(...arguments);
        this.forceSemt = true;
        this.butcherProducts = [];
        this.markdown = new MarkdownIt();
        this.foods = [];
        this.butcherResources = [];
        this.reviews = [];
        this.shopCardIndex = -1;
        this.shopCardItem = null;
        this.dispatchingAvailable = true;
        this.productTypeManager = null;
        this.dispatcherTypes = dispatcher_2.DispatcherTypeDesc;
    }
    get ProductTypeManager() {
        let params = {
            product: this.product
        };
        if (this.shopCardItem && this.shopCardItem.productTypeData) {
            params = Object.assign(Object.assign({}, params), this.shopCardItem.productTypeData);
        }
        let result = this.productTypeManager || (this.productTypeManager = common_1.ProductTypeFactory.create(this.product.productType, params));
        return result;
    }
    showOtherButchers() {
        let show = true;
        if (this.req.query.butcher) {
            show = (this.req.query.utm_medium != 'Social') && (this.req.query.utm_medium != 'Butcher');
        }
        // let shopcard = this.shopcard;
        // let scButcher = (shopcard.items && shopcard.items.length) ? shopcard.items[0].product.butcher.id : null;
        // if (scButcher) {
        //     let inServing = serving.find(p => p.butcherid == scButcher);
        //     let inOther = others.find(p => p.butcherid == scButcher);
        //     return inServing || inOther
        // } else return null;
        return show;
    }
    productRoute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.req.params.product) {
                return this.next();
            }
            let product = yield product_1.default.findOne({
                include: [{
                        model: productcategory_1.default,
                        include: [category_1.default]
                    }
                ], where: { slug: this.req.params.product }
            });
            if (!product)
                return this.next();
            this.product = product;
            this.api = new product_2.default(this.constructorParams);
            let shopcard = this.shopcard = yield shopcard_1.ShopCard.createFromRequest(this.req);
            yield product.loadResources();
            yield product.loadnutritionValues();
            this.shopCardIndex = this.req.query.shopcarditem ? parseInt(this.req.query.shopcarditem) : -1;
            this.shopCardItem = (this.shopCardIndex >= 0 && shopcard.items) ? shopcard.items[this.shopCardIndex] : null;
            let butcher = null;
            if (this.shopCardItem) {
                butcher = yield butcher_1.default.getBySlug(this.shopCardItem.product.butcher.slug);
            }
            else if (this.req.query.butcher) {
                butcher = yield butcher_1.default.getBySlug(this.req.query.butcher);
            }
            else if (this.req.session && this.req.session.prefButcher) {
                butcher = yield butcher_1.default.getBySlug(this.req.session.prefButcher);
            }
            this.reviews = yield this.api.loadReviews(product.id, (butcher && this.showOtherButchers()) ? 0 : (butcher ? butcher.id : 0));
            // this.reviews = await api.loadReviews(product.id, butcher ? (this.req.query.butcher ? butcher.id : 0): 0);
            //this.reviews = await api.loadReviews(product.id, 0);
            this.foods = yield this.api.getTarifVideos([product]);
            if (this.req.query.semt) {
                let area = yield area_1.default.getBySlug(this.req.query.semt);
                yield this.req.helper.setPreferredAddressByArea(area, true);
            }
            let selectedButchers;
            if (!this.req.prefAddr) {
                selectedButchers = {
                    best: null,
                    serving: [],
                    takeOnly: []
                };
            }
            else {
                selectedButchers = yield this.api.locateButchersForProduct(product, this.req.prefAddr, butcher, shopcard);
            }
            let serving = selectedButchers.serving.concat(selectedButchers.takeOnly);
            if (selectedButchers.best && this.req.query.butcher && (selectedButchers.best.butcher.slug != this.req.query.butcher)) {
                serving = [];
                selectedButchers.best = null;
            }
            let view = yield this.api.getProductView(product, selectedButchers.best ? selectedButchers.best.butcher : null, null, true);
            let fromTo;
            if (this.req.prefAddr) {
                fromTo = {
                    start: null,
                    finish: this.req.prefAddr.based.location,
                    fId: this.req.prefAddr.based.id.toString()
                };
            }
            for (let i = 0; i < serving.length; i++) {
                let s = serving[i];
                let butcher = s.butcher;
                let dispatcher = s;
                if (view.butcher && (butcher.id != view.butcher.id)) {
                    let bp = butcher.products.find(bp => bp.productid == product.id);
                    fromTo.start = butcher.location;
                    fromTo.sId = butcher.id.toString();
                    view.alternateButchers.push({
                        butcher: {
                            shipday0: butcher.shipday0,
                            shipday1: butcher.shipday1,
                            shipday2: butcher.shipday2,
                            shipday3: butcher.shipday3,
                            shipday4: butcher.shipday4,
                            shipday5: butcher.shipday5,
                            shipday6: butcher.shipday6,
                            id: butcher.id,
                            description: butcher.description,
                            enableCreditCard: butcher.enableCreditCard,
                            slug: butcher.slug,
                            badges: butcher.getBadgeList(),
                            userRatingAsPerc: butcher.userRatingAsPerc,
                            shipRatingAsPerc: butcher.shipRatingAsPerc,
                            shipSuccessText: butcher.shipSuccessText,
                            name: butcher.name,
                            puanData: butcher.getPuanData(this.product.productType),
                            earnedPuan: 0.00,
                            calculatedRate: butcher.calculatedRate,
                            kgPrice: bp ? bp.kgPrice : 0,
                            locationText: butcher.locationText,
                            productNote: bp ? (bp.mddesc ? this.markdown.render(bp.mddesc) : "") : "",
                            thumbnail: this.req.helper.imgUrl("butcher-google-photos", butcher.slug)
                        },
                        dispatcher: dispatcher ? {
                            id: dispatcher.id,
                            fee: dispatcher.fee,
                            minCalculated: dispatcher.minCalculated,
                            totalForFree: dispatcher.totalForFree,
                            type: dispatcher.type,
                            distance: dispatcher.butcherArea.bestKm,
                            priceSlice: [],
                            priceInfo: dispatcher.priceInfo,
                            userNote: dispatcher.userNote,
                            takeOnly: dispatcher.takeOnly
                        } : null,
                        purchaseOptions: this.api.getPurchaseOptions(product, bp).map(po => {
                            return {
                                unit: po.unit,
                                unitTitle: po.unitTitle,
                                unitPrice: po.unitPrice
                            };
                        })
                    });
                }
                else if (view.butcher && view.butcher.id == s.butcher.id) {
                    view.butcher.calculatedRate = butcher.calculatedRate;
                    fromTo.start = s.butcher.location;
                    fromTo.sId = s.butcher.id.toString();
                    this.logisticsProvider = dispatcher ? dispatcher.provider : null;
                    view.dispatcher = dispatcher ? {
                        id: dispatcher.id,
                        fee: dispatcher.fee,
                        minCalculated: dispatcher.minCalculated,
                        totalForFree: dispatcher.totalForFree,
                        type: dispatcher.type,
                        priceInfo: dispatcher.priceInfo,
                        distance: dispatcher.butcherArea.bestKm,
                        priceSlice: yield dispatcher.provider.priceSlice(fromTo),
                        userNote: dispatcher.userNote,
                        takeOnly: dispatcher.takeOnly
                    } : null;
                }
            }
            if (view.butcher) {
                let calculator = new commissionHelper_1.PuanCalculator();
                view.butcher.earnedPuan = this.req.user ? yield calculator.getEarnedButcherPuan(this.req.user.id, view.butcher.id) : 0.00;
                this.butcherProducts = yield butcherproduct_1.default.findAll({
                    where: {
                        butcherid: view.butcher.id,
                        vitrin: true,
                        [sequelize_1.Op.or]: [
                            {
                                kgPrice: {
                                    [sequelize_1.Op.gt]: 0
                                }
                            },
                            {
                                unit1price: {
                                    gt: 0.0
                                }
                            },
                            {
                                unit2price: {
                                    [sequelize_1.Op.gt]: 0.0
                                }
                            },
                            {
                                unit3price: {
                                    [sequelize_1.Op.gt]: 0.0
                                }
                            }
                        ]
                    },
                    include: [
                        {
                            model: product_1.default
                        }
                    ]
                });
            }
            if (view.butcher) {
                this.butcherResources = yield resource_1.default.findAll({
                    where: {
                        type: ["butcher-google-photos", "butcher-videos"],
                        ref1: view.butcher.id,
                        list: true
                    },
                    order: [["displayOrder", "DESC"], ["updatedOn", "DESC"]]
                });
            }
            this.productLd = (product.status == "onsale") ? yield this.api.getProductLd(product, {
                thumbnail: false
            }) : null;
            if (this.productLd) {
                if (!this.productLd.offers) {
                    this.productLd = null;
                }
            }
            if (!this.req.prefAddr) {
                if (butcher && butcher.slug == this.req.query.butcher) {
                    let pview = yield this.api.getProductView(product, butcher);
                    this.startPrice = {
                        title: butcher.name,
                        basedOn: 'butcher',
                        view: pview.priceView
                    };
                }
                else {
                    if (this.productLd && this.productLd.offers) {
                        this.startPrice = {
                            title: '',
                            basedOn: 'global',
                            view: {
                                price: this.productLd.offers.lowPrice, unit: this.productLd.offers.unit, unitTitle: this.productLd.offers.unit
                            }
                        };
                    }
                }
            }
            this.dispatchingAvailable = this.req.prefAddr && (view.butcher != null || (yield new dispatcher_1.default(this.constructorParams).dispatchingAvailable(this.req.prefAddr, this.api.useL1(this.product))));
            //this.semtReturn = "/" + this.product.slug + 
            //this.appUI.tabIndex = 1;
            this.res.render('pages/product', this.viewData({
                butcherProducts: this.butcherProducts.map(p => p.product), butchers: selectedButchers,
                pageTitle: product.name + ' Siparişi ve Fiyatları',
                // pageDescription: product.pageDescription + ' ', 
                pageThumbnail: this.req.helper.imgUrl('product-photos', product.slug),
                pageDescription: product.generatedDesc,
                product: product, view: view,
                __hidesupportMessage: false,
                __supportMessage: `${`Merhaba, kasaptanal.com üzerinden ${this.req.prefAddr ? '' + this.req.prefAddr.display + '' : ''} size ulaşıyorum.  ${product.name} (${this.url}/${product.slug}) ile ilgili whatsapp üzerinden yardımcı olabilir misiniz?`}`
            }));
        });
    }
    productPhotoRoute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.req.params.product || !this.req.params.filename)
                return this.next();
            let product = this.req.__products[this.req.params.product];
            if (!product)
                return this.next();
            let photo, thumbnail = false, url = "";
            let res = new resource_2.default(this.constructorParams);
            let type = "product-photos";
            let defaultFile = "public/img/product-default-thumbnail.jpg";
            if (this.req.params.filename == "thumbnail") {
                thumbnail = true;
                photo = this.req.helper.getResourcesOfType(type + product.id).find(p => p.ref1 == product.id);
            }
            else
                photo = this.req.helper.getResourcesOfType(type + this.req.params.filename).find(p => p.contentUrl == this.req.params.filename);
            res.sendResource(photo, thumbnail, thumbnail ? defaultFile : null);
        });
    }
    static SetRoutes(router) {
        router.get("/:product", Route.BindRequest(Route.prototype.productRoute));
        // router.get("/:product/yemek-tarifi/:tarif", Route.BindRequest(Route.prototype.productRoute));
        // router.get("/:product/ile-yapin/:tarif", Route.BindRequest(Route.prototype.productRoute));
        //router.get("/:product", Route.BindRequest(Route.prototype.productRoute));
        config_1.default.nodeenv == 'development' ? router.get("/:product/resimler/:filename", Route.BindRequest(Route.prototype.productPhotoRoute)) : null;
    }
}
__decorate([
    common_1.Auth.Anonymous(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Route.prototype, "productRoute", null);
__decorate([
    common_1.Auth.Anonymous(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Route.prototype, "productPhotoRoute", null);
exports.default = Route;
