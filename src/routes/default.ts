import { ApiRouter, ViewRouter } from '../lib/router';
import * as express from "express";
import ButcherModel from '../db/models/butcher';
import moment = require('moment');
import { Auth } from '../lib/common';
import Helper from '../lib/helper';
import Resource from '../db/models/resource';
import Area from '../db/models/area';
import { where } from 'sequelize/types';
import Product from '../db/models/product';
import Category from '../db/models/category';
import ProductManager from '../lib/productManager';
import config from '../config';
import ProductsApi from './api/product';
import Content from '../db/models/content';
import { ProductCacheItem, CacheManager } from '../lib/cache';
import { Op } from 'sequelize';
import { SiteStatsData } from '../models/sitestat';
import { SiteStats } from '../lib/sitestats';
import TempLoc from '../db/models/temp_loc';
import { Order } from '../db/models/order';
import OrderApi from './api/order'
import ButcherProduct from '../db/models/butcherproduct';
import Butcher from '../db/models/butcher';
import { bodyBlacklist } from 'express-winston';
import { CreditcardPaymentFactory } from '../lib/payment/creditcard';
import SiteLogRoute from './api/sitelog';
import fts from './api/fts';

let ellipsis = require('text-ellipsis');

export default class Route extends ViewRouter {

    lastOrders: Order[] = [];
    hide4Sebep = false;
    foods: Resource[];
    blogItems: Content[];
    foodsTitle = "Et Yemekleri";
    stats: SiteStatsData;

    async getBlogItems() {
        return this.req.__recentBlogs;
    }


    filterProductsByCategory(category: Category, limit = 8) {
        let result: ProductCacheItem[] = []
        let prodSlugs = this.req.__categoryProducts[category.slug];
        if (prodSlugs) {
            for (let i = 0; i < prodSlugs.length; i++) {
                let product = this.req.__products[prodSlugs[i].slug];
                if (product) result.push(product);
                if (result.length >= limit) break;
            }
        }
        return result; //.slice(0, 8);
    }

    @Auth.Anonymous()
    async kasapViewRoute() {
        this.foods = await new ProductsApi(this.constructorParams).getFoodResources(null, 10);

        await this.sendView("pages/content.kasap-basvuru.ejs", this.viewData({

        }))
    }


    @Auth.Anonymous()
    async defaultRoute() {
        let recentButchers: ButcherModel[] = await CacheManager.dataCache.get("recent-butchers");
        if (!recentButchers) {
            recentButchers = await ButcherModel.findAll({
                order: [["displayOrder", "DESC"]],
                limit: 12,
                where: {
                    approved: true,
                    showListing: true
                }
            });
            CacheManager.dataCache.set("recent-butchers", recentButchers.map(b => b.get({ plain: true })));
        }

        if (this.req.user) {
            this.lastOrders = await new OrderApi(this.constructorParams).lastOrders(this.req.user.id, 9)
        }

        // this.foods = await new ProductsApi(this.constructorParams).getResources({
        //     type: ['product-videos', 'product-photos'],
        //     list: true,
        //     tag1: {
        //         [Op.or]: [{
        //             [Op.like]: '%yemek%'

        //         }, { [Op.like]: '%tarif%' }]
        //     }
        // }, null, 10);
        // this.foodsTitle = 'Yemekler ve Tarifler'

        //this.foods = CacheManager.dataCache.get("recent-foods");
        this.blogItems = await this.getBlogItems();
        //this.stats = await SiteStats.get();


        this.appUI.tabIndex = 0;
        await this.createUserLog();
        this.res.render("pages/default.ejs", this.viewData({
            recentButchers: recentButchers,
            ellipsis: ellipsis
        }));

    }

    @Auth.Anonymous()
    async testsubmit() {
        this.res.redirect('/')
    }

    @Auth.Anonymous()
    async butcherApply() {
        this.renderView('pages/kasap-basvuru.ejs');
    }



    @Auth.Anonymous()
    async butcherInfo() {
        this.renderView('pages/kasap-bilgi-giris.ejs');
    }

    @Auth.Anonymous()
    async setUserAddr() {
        let area = await Area.getBySlug(this.req.params.slug);
        if (!area) return this.next();
        await this.req.helper.setPreferredAddressByArea(area, true, (this.req.query.lat && this.req.query.lat != 'undefined')  ? {
            type: 'Point',
            coordinates: [parseFloat(this.req.query.lat as string),parseFloat(this.req.query.lng as string)]
        }: null);
        
        if (this.req.query.r)
            this.res.redirect(this.req.query.r as string);
        else this.res.redirect('/')
    }

    async tempbutcher() {

        let bs = await Butcher.findAll({
            where: {
                approved: true
            }
        });

        let s = "";

        for (let i = 0; i < (bs).length; i++) {
            let bt = bs[i];
            try {
                if (!bt.companyType) continue;
                let payment = CreditcardPaymentFactory.getInstance("iyzico");
                payment.logger = new SiteLogRoute(this.constructorParams);
                let subMerchantReq = payment.subMerchantRequestFromButcher(bt);
                let result = await payment.createSubMerchant(subMerchantReq);
                let k = result.subMerchantKey;
                bt.iyzicoSubMerchantKey = k;
                await bt.save();
                s += 'BAŞARILI' + bt.name + '\n'; 
            } catch (err) {
                console.log(bt.name + ' hata:' + err.errorMessage);
                s += 'HATA' + bt.name + ' hata:' + err.errorMessage + bt.name + '\n';
            }

        }

        this.res.send(s);
    }

    async tempprods() {

        let prods = await Product.findAll({

        });

        for (let i = 0; i < prods.length; i++) {
            let prod = prods[i];

            let pbu = prod.priceBasedUnitId;
            let availIds = prod.availableUnitIds;

            if (pbu && prod[`${pbu}kgRatio`] != 1) {
                prod[`${pbu}kgRatio`] = 1;
                console.log(`${prod.name} ratio 1 olmalıydı`)
            }

            if (availIds.length == 1 && prod[`${availIds[0]}ButcherUnitSelection`] != 'forced') {
                console.log(`${prod.name} için tek unit var ancak zorunlu tutulmamış`)
                prod[`${availIds[0]}ButcherUnitSelection`] = 'forced';
                await prod.save();
            }

        }



        let bps = await ButcherProduct.findAll({
            include: [
                { model: Product },
                { model: Butcher }
            ]
        });
        for (let i = 0; i < bps.length; i++) {
            let bp = bps[i];
            for (let u = 1; u < 4; u++) {
                let unit = `unit${u}`;

                if (bp.enabled && (bp.kgPrice > 0 || bp[`${unit}price`] > 0)
                    && bp[`${unit}enabled`] && !bp.product[`${unit}`]) {
                    bp[`${unit}enabled`] = false;
                    console.log(`${bp.butcher.name}-${bp.product.name}-${unit} null olduğu için disable edildi`)
                }





            }

            if (bp.enabled && bp.enabledUnits.length == 0) {
                bp.enabled = false;
                console.log(`${bp.butcher.name}-${bp.product.name} hiçbir unit seçili olmadığı için için disable edildi`)

            }


            let availIds = bp.product.availableUnitIds;

            if (bp.enabled) {
                let exist = false;
                availIds.forEach(a => {
                    if (bp[`${a}enabled`]) exist = true;
                })
                if (!exist) {
                    console.log(`${bp.butcher.name}-${bp.product.name} ürünü satışta ancak hiçbir unit seçili değil`);
                }
            }



            await bp.save();

        }




        this.res.send('OK');
    }

    async tempares() {
        let tl = await TempLoc.findAll({
            where: {
                il: ['ISPARTA']
            }
        })

        for (let i = 0; i < tl.length; i++) {
            let t = tl[i];
            t.semt = t.semt.replace("ERYAMANEVLERİ", "ERYAMAN")
            t.semt = t.semt.replace("HASKÖY S.EVLERİ", "HASKÖY SUBAYEVLERİ")



            let slug = Helper.slugify(`${t.il}-${t.ilce}-${t.semt}`);
            let area = await Area.findOne({
                where: {
                    slug: slug
                }
            })



            if (!area) {
                area = new Area();
                area.name = Helper.capitlize(`${t.semt}`);
                area.slug = Helper.slugify(`${t.il}-${t.ilce}-${t.semt}`);
                area.parentid = (await Area.findOne({
                    where: {
                        slug: Helper.slugify(`${t.il}-${t.ilce}`)
                    }
                })).id;
                area.lowerName = Helper.toLower(area.name);
                area.level = 3;
                area.status = 'generic';
                try {
                    await area.save();
                    console.log(area.slug + ' eklendi');
                } catch (err) {
                    console.log(err.message);
                    console.log(area.slug + ' hata');

                }

            }
            let na: Area = new Area();
            na.name = Helper.capitlize(t.mahalle.replace(" MAH", ' Mahallesi'));
            na.slug = Helper.slugify(`${area.slug}-${t.mahalle.replace(" MAH", '')}`);
            na.parentid = area.id;
            na.lowerName = Helper.toLower(na.name);
            na.level = 4;
            na.status = 'generic';
            try {
                await na.save();
            } catch (err) {
                console.log(na.slug + ' mevcut')
            }




        }

        this.res.send('OK')
    }

    @Auth.Anonymous()
    async evaluateOrder() {
        let order = await Order.findOne({
            where: {
                ordernum: this.req.params.ordernum
            }
        });

        if (!order) return this.next();

        //if (!order.canBeEvaluated()) order = null;

        this.sendView('pages/order.evaluate.ejs', {
            order: order
        });
    }



    @Auth.Anonymous()
    async searchView() {
        let results = !this.req.query.q ? []: await (new fts(this.constructorParams).getResult(this.req.query.q as string))
        this.sendView('pages/search.ejs', {
            results: results
        });        
    }

    

    static SetRoutes(router: express.Router) {
        // if (config.nodeenv == 'production') {
        //     router.get("/home", Route.BindRequest(this.prototype.defaultRoute))
        //     router.get("/", Route.BindToView("pages/offline.ejs"))
        // }
        // else {

        // }
        router.get("/", Route.BindRequest(this.prototype.defaultRoute))
        router.get("/temparea", Route.BindRequest(this.prototype.tempares))
        router.get("/tempproducts", Route.BindRequest(this.prototype.tempprods));
        router.get("/tempiyzico", Route.BindRequest(this.prototype.tempbutcher));

        // router.get("/testsubmit", Route.BindToView("pages/test-submit.ejs"))
        // router.post("/testsubmit", Route.BindRequest(this.prototype.testsubmit))

        router.get("/adres-belirle/:slug", Route.BindRequest(this.prototype.setUserAddr))
        router.get("/hikayemiz", Route.BindToView("pages/content.kurumsal.ejs"));
        router.get("/neden-kasaptanal", Route.BindToView("pages/content.neden-kasaptanal.ejs"));
        router.get("/iletisim", Route.BindToView("pages/content.contact.ejs"))
        router.get("/yardim", Route.BindToView("pages/content.yardim.ejs"))
        router.get("/kasap-secim-kriterleri", Route.BindToView("pages/content.kasap-secim.ejs"))
        router.get("/kasap", Route.BindRequest(this.prototype.kasapViewRoute))
        router.get("/kullanici-sozlesmesi", Route.BindToView("pages/content.kullanici-sozlesmesi.ejs"))
        router.get("/gizlilik-sozlesmesi", Route.BindToView("pages/content.gizlilik-sozlesmesi.ejs"))
        router.get("/satis-sozlesmesi", Route.BindToView("pages/content.satis-sozlesmesi.ejs"))
        router.get("/mobil-uygulamalar", Route.BindToView("pages/content.mobil-uygulamalar.ejs"));
        router.get("/kasap-basvuru/:butcher?", Route.BindRequest(this.prototype.butcherApply));
        router.get("/kasap-bilgi-giris/:butcher?", Route.BindRequest(this.prototype.butcherInfo));
        router.get("/eval/:ordernum", Route.BindRequest(this.prototype.evaluateOrder));
        router.get("/ara", Route.BindRequest(this.prototype.searchView));
        
    }
}