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
exports.RequestHelper = void 0;
const area_1 = require("../db/models/area");
const config_1 = require("../config");
class RequestHelper {
    constructor(req) {
        this.req = req;
    }
    _generateUrl(resource, thumbnail, defaultPath) {
        let pathprefix = resource ? resource.folder : "";
        if (!resource) {
            if (defaultPath) {
                return defaultPath;
            }
        }
        let filePath = thumbnail ? `${pathprefix}/${resource.thumbnailUrl}` : `${pathprefix}/${resource.contentUrl}`;
        return `${config_1.default.staticDomain}/${filePath}`;
    }
    imgUrl(resourceType, slug, filename = 'thumbnail', thumbnail = true, tag1 = null) {
        let defaultFile = '';
        let ref1 = 0;
        if (resourceType == 'product-photos') {
            ref1 = this.req.__products[slug] ? this.req.__products[slug].id : 0;
            defaultFile = config_1.default.staticDomain + "/resource/img/product-default-thumbnail.jpg";
        }
        else if (resourceType == 'category-photos') {
            let category = this.req.__categories.find(p => p.slug == slug);
            ref1 = category ? category.id : 0;
            defaultFile = config_1.default.staticDomain + "/resource/img/category-default-thumbnail.jpg";
        }
        else if (resourceType == 'butcher-google-photos') {
            ref1 = this.req.__butchers[slug] ? this.req.__butchers[slug].id : 0;
            defaultFile = config_1.default.staticDomain + "/resource/img/butcher-default-thumbnail.jpg";
        }
        let photo;
        if (filename == "thumbnail") {
            photo = tag1 ? (this.req.helper.getResourcesOfType(resourceType + ref1).find(p => p.ref1 == ref1 && p.tag1 == tag1) || this.req.helper.getResourcesOfType(resourceType + ref1).find(p => p.ref1 == ref1)) :
                this.req.helper.getResourcesOfType(resourceType + ref1).find(p => p.ref1 == ref1);
        }
        else {
            photo = this.req.helper.getResourcesOfType(resourceType + filename).find(p => p.contentUrl == filename);
        }
        return this._generateUrl(photo, thumbnail, defaultFile);
    }
    getResourcesOfType(type) {
        return this.req.__resources[type] || [];
    }
    setPreferredAddress(adr, save = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (adr && (adr.level3Id || adr.level4Id)) {
                let area = yield area_1.default.findByPk(adr.level4Id || adr.level3Id, {
                    include: [
                        { all: true }
                    ]
                });
                yield area.loadRelatedAreas();
                yield area.ensureLocation();
                let l1 = area.getLevel(1);
                let l2 = area.getLevel(2);
                let l3 = area.getLevel(3);
                let l4 = area.getLevel(4);
                adr.level1Id = l1.id;
                adr.level2Id = l2.id;
                adr.level3Id = l3.id;
                adr.level4Id = l4 ? l4.id : undefined;
                adr.level1Text = l1.name;
                adr.level2Text = l2.name;
                adr.level3Text = l3.name;
                adr.level4Text = l4 ? l4.name : undefined;
                adr.level1Slug = l1.slug;
                adr.level2Slug = l2.slug;
                adr.level3Slug = l3.slug;
                adr.level4Slug = l4 ? l4.slug : undefined;
                adr.level1Status = l1.status;
                adr.level2Status = l2.status;
                adr.level3Status = l3.status;
                adr.level4Status = l4 ? l4.status : undefined;
                adr.lat = adr.lat || area.location ? area.location.coordinates[0] : undefined;
                adr.lng = adr.lng || area.location ? area.location.coordinates[1] : undefined;
                adr.display = l4 ? `${adr.level4Text}, ${adr.level2Text}/${adr.level1Text}` :
                    `${adr.level3Text}, ${adr.level2Text}/${adr.level1Text}`;
                this.req.prefAddr = adr;
                if (save) {
                    if (this.req.user) {
                        this.req.user.lastLevel1Id = adr.level1Id;
                        this.req.user.lastLevel2Id = adr.level2Id;
                        this.req.user.lastLevel3Id = adr.level3Id;
                        this.req.user.lastLevel4Id = adr.level4Id;
                        this.req.user.lastLocation = {
                            type: 'Point',
                            coordinates: [adr.lat, adr.lng]
                        };
                        yield this.req.user.save();
                    }
                    else {
                        this.req.session.prefAddr = adr;
                        yield new Promise((resolve, reject) => {
                            this.req.session.save(err => (err ? reject(err) : resolve()));
                        });
                    }
                }
            }
            else
                delete this.req.prefAddr;
        });
    }
    static use(app) {
        app.use((req, res, next) => {
            req.helper = new RequestHelper(req);
            req.helper.fillPreferredAddress().then(r => next()).catch(next);
        });
    }
    fillPreferredAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            let req = this.req, list = [];
            if (req.user && req.session.prefAddr != null) {
                req.user.lastLevel1Id = req.session.prefAddr.level1Id;
                req.user.lastLevel2Id = req.session.prefAddr.level2Id;
                req.user.lastLevel3Id = req.session.prefAddr.level3Id;
                req.user.lastLevel4Id = req.session.prefAddr.level4Id;
                req.session.prefAddr = null;
                yield req.user.save();
            }
            var adr = {
                level1Id: null,
                level2Id: null,
                level3Id: null,
                level4Id: null,
            };
            if (req.user) {
                adr.level1Id = req.user.lastLevel1Id;
                adr.level2Id = req.user.lastLevel2Id;
                adr.level3Id = req.user.lastLevel3Id;
                adr.level4Id = req.user.lastLevel4Id;
            }
            else if (req.session.prefAddr) {
                adr = req.session.prefAddr;
            }
            yield this.setPreferredAddress(adr);
        });
    }
}
exports.RequestHelper = RequestHelper;
