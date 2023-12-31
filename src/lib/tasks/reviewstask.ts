import { BaseTask } from "./basetask";
import { Order, OrderItem } from "../../db/models/order";
import * as sq from 'sequelize';
import { OrderItemStatus } from "../../models/order";
import Butcher from "../../db/models/butcher";
import Review from "../../db/models/review";
import { Op, Sequelize } from "sequelize";
import Product from "../../db/models/product";
import Helper from "../helper";



export default class ButcherStats extends BaseTask {

    get interval() {
        return "25 0 * * *"
    }



    async run() {
        console.log('running reviews job', Helper.formatDate(Helper.Now(), true))
        let reviews = await Review.findAll({
            where: {
                settingsjson: {
                    [Op.is]: null
                },
                type: 'order'
            }
        });

        for (let i = 0; i < reviews.length; i++) {
            let r = reviews[i];
            let products = await OrderItem.findAll(
                {
                    where: {
                        orderid: r.ref1,
                        status: OrderItemStatus.success
                    },
                    include: [{
                        model: Product
                    }]
                }
            ).map(async oi => oi.product)
            if (products.length) {
                r.settings = {
                    products: products.map(p => {
                        return {
                            name: p.name,
                            slug: p.slug,
                            id: p.id
                        }
                    })
                }
                await r.save();
                await new Promise(r => setTimeout(r, 5));
            }
        }


        console.log('done reviews job', Helper.formatDate(Helper.Now(), true))

    }
}