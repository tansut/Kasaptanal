import { ApiRouter, ViewRouter } from '../../lib/router';
import * as express from "express";
import ButcherModel from '../../db/models/butcher';
import moment = require('moment');
import { Auth } from '../../lib/common';
import Area from '../../db/models/area';
import Resource from '../../db/models/resource';
import { parse } from 'querystring';
import { threadId } from 'worker_threads';
import Helper from '../../lib/helper';
import * as fs from "fs"
import Category from '../../db/models/category';
import ResourceCategory from '../../db/models/resourcecategory';
var beautify = require("json-beautify");

export default class Route extends ViewRouter {

    categories: Category[] = [];
    beautify = beautify;

    async getResources() {
        return await Resource.findAll({
            where: {
                type: [this.req.params.type as string, this.req.query.videotype as string],
                ref1: this.req.params.ref1
            },
            include: [
                {
                    all: true
                }
            ]
            , order: [["type", "ASC"], ["displayOrder", "DESC"], ["updatedOn", "DESC"]]
        })
    }

    getResourceCategory(resource: Resource, categoryid: number) {
        let productCategory = resource.categories.find(c => c.categoryid == categoryid)
        return productCategory ? {
            displayOrder: productCategory.displayOrder,
            enabled: true,
            productCategory: productCategory
        } : {
                displayOrder: "",
                enabled: false
            }
    }


    @Auth.Anonymous()
    async editViewRoute() {
        if (!this.req.params.type || !this.req.params.ref1) {
            return this.next();
        }

        let resources = await this.getResources()
        this.categories = await this.getCategories();

        this.res.render('pages/admin/resource.get.ejs', this.viewData({ images: resources }))
    }

    async addVideo(youtubeid) {
        let res = await Resource.create({
            type: this.req.query.videotype,
            ref1: this.req.params.ref1,
            contentType: "video-youtube",
            contentLength: 0,
            contentUrl: youtubeid,
            thumbnailUrl: "",
            folder: ""
        })
        return res;
    }

    async normalizeResourcePhoto(id) {
        let resource = await Resource.findByPk(id);
        let filedest = Helper.ResourcePaths[this.req.params.type];

        await Helper.normalizePhoto(this.publicDir + `${filedest}/${resource.contentUrl}`, this.publicDir + `${filedest}/${resource.thumbnailUrl}`);


    }

    async addPhoto(photofile) {
        let resources = await this.getResources();


        return new Promise<void>((resolve, reject) => {

            let fileprefix = this.req.query.fileprefix || "";
            let filedest = Helper.ResourcePaths[this.req.params.type];
            let random = Helper.getRandomInt(1000);

            let fileName = `${fileprefix}-${this.req.params.ref1}-${resources.length + 1}-${random}.jpg`;
            let dest = this.publicDir + `${filedest}/${fileName}`
            let thumbnailName = `${fileprefix}-${this.req.params.ref1}-${resources.length + 1}-${random}-thumbnail.jpg`;   

            photofile.mv(dest, (err) => {
                if (err)
                    return reject(err);
                return Helper.normalizePhoto(this.publicDir + `${filedest}/${fileName}`, this.publicDir + `${filedest}/${thumbnailName}`).then((img: any) => {
                    return Resource.create({
                        type: this.req.params.type,
                        ref1: this.req.params.ref1,
                        contentType: "image/jpeg",
                        contentLength: photofile.size,
                        contentUrl: fileName,
                        thumbnailUrl: thumbnailName,
                        folder: filedest,
                        w: img.getWidth().toString(),
                        h: img.getHeight().toString(),
                    }).then(()=>resolve()).catch((err)=>reject(err))
                }).catch(err=>reject(err))                    
            });
        })
    }

    async getCategories() {
        return await Category.findAll({
            where: {
                type: 'resource'
            }
        })
    }

    @Auth.Anonymous()
    async saveRoute() {

        if (!this.req.params.type || !this.req.params.ref1) {
            return this.next();
        }


        let resources = await this.getResources();
        this.categories = await this.getCategories();


        if (this.req.body.delimage) {
            let id = parseInt(this.req.body.delimage);

            let resource = await Resource.findByPk(id);



            await Resource.destroy({
                where: {
                    id: id
                }
            })

            if (resource.contentType == 'image/jpeg') {
                fs.existsSync(this.publicDir + resource.getFileUrl()) ? fs.unlinkSync(this.publicDir + resource.getFileUrl()) : null;
                (resource.thumbnailUrl && fs.existsSync(this.publicDir + resource.getThumbnailFileUrl())) ? fs.unlinkSync(this.publicDir + resource.getThumbnailFileUrl()) : null;
    
            }




        } else if (this.req.body.updatecategory) {
            let categoryid = parseInt(this.req.body.updatecategory);
            let id = parseInt(this.req.body['resourceid' + categoryid]);
            let resource = await Resource.findByPk(id);
            await ResourceCategory.destroy({
                where: {
                    resourceid: resource.id,
                    categoryid: categoryid
                }
            })
            if (this.req.body['categoryenabled' + categoryid] == "on") {
                let newItem = new ResourceCategory();
                newItem.resourceid = resource.id;
                newItem.categoryid = categoryid;

                newItem.displayOrder = (this.req.body['categorydisplayorder' + categoryid]  ? parseInt(this.req.body['categorydisplayorder' + categoryid]) : 0)
                await newItem.save();
            }
            }
        else if (this.req.body.pritimage) {
            let id = parseInt(this.req.body.pritimage);
            let resource = resources.find((res) => res.id == id);
            resource.changed('type', true)
            await resource.save();
        } else if (this.req.body.resizeimage) {
            let id = parseInt(this.req.body.resizeimage);
            await this.normalizeResourcePhoto(id)
            
        } else if (this.req.body.saveimage) {
            let id = parseInt(this.req.body.saveimage);
            let resource = resources.find((res) => res.id == id);
            resource.title = this.req.body['imgtitle' + id] || null;
            resource.slug = this.req.body['imgslug' + id] || null;
            resource.tag1 = this.req.body['imgtag1' + id] || null;
            resource.displayOrder = this.req.body['imgdisplayorder' + id] ? parseInt(this.req.body['imgdisplayorder' + id]): 0;

            
            resource.tag2 = this.req.body['imgtag2' + id];
            resource.tag3 = this.req.body['imgtag3' + id];
            resource.keywords = this.req.body['keywords' + id];
            resource.description = this.req.body['imgdesc' + id];
            resource.badge = this.req.body['imgbadge' + id];
            resource.settings = this.req.body['imgsettings' + id] ? JSON.parse(this.req.body['imgsettings' + id]) : {};
            resource.mddesc = this.req.body['imgmddesc' + id];
            resource.ref2 = this.req.body['imgref1' + id] ? parseInt(this.req.body['imgref1' + id]): null;
            resource.ref2 = this.req.body['imgref2' + id] ? parseInt(this.req.body['imgref2' + id]): null;
            resource.ref3 = this.req.body['imgref3' + id] ? parseInt(this.req.body['imgref3' + id]): null;
            resource.ref4 = this.req.body['imgref4' + id] ? parseInt(this.req.body['imgref4' + id]): null;
            resource.ref5 = this.req.body['imgref5' + id] ? parseInt(this.req.body['imgref5' + id]): null;
            resource.ref6 = this.req.body['imgref6' + id] ? parseInt(this.req.body['imgref6' + id]): null;

            resource.list = this.req.body['imglist' + id] == "on";

            if (resource.contentType != "image/jpeg" && (resource.thumbnailUrl != this.req.body['imgthumbnail' + id])) {
                resource.thumbnailUrl = this.req.body['imgthumbnail' + id];
            }
            await resource.save();
        } 
        else if (this.req.body.addimg && this.req["files"] && Object.keys(this.req["files"]).length != 0) {
            let photofile = this.req["files"].photofile;
            await this.addPhoto(photofile);
        } else if (this.req.body.addvideo && this.req.body.youtubeid) {
            await this.addVideo(this.req.body.youtubeid)
        }

        resources = await this.getResources();

        this.res.render('pages/admin/resource.get.ejs', this.viewData({ images: resources }))
    }

    static SetRoutes(router: express.Router) {
        router.get("/resource/:type/:ref1", Route.BindRequest(Route.prototype.editViewRoute));
        router.post("/resource/:type/:ref1", Route.BindRequest(Route.prototype.saveRoute));
    }
}

