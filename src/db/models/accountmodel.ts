import { Table, Column, DataType, Model, HasMany, CreatedAt, UpdatedAt, DeletedAt, Unique, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import BaseModel from "./basemodel"
import { AccountingOperation, Account } from '../../models/account';
import Helper from '../../lib/helper';
import { SaveOptions } from 'sequelize/types';
const orderid = require('order-id')('dkfjsdklfjsdlkg450435034.,')
import * as sq from 'sequelize';
import { Op } from 'sequelize';
import { threadId } from 'worker_threads';


@Table({
    tableName: "Accounts",
    indexes: [{
        name: "acc_idx_1",
        fields: ["code"]
    },

    {
        name: "acc_idx_2",
        fields: ["operation", "accorder"]
    }]
})


class AccountModel extends BaseModel<AccountModel> {

    static fromAccount(l: Account) {
        return new AccountModel({            
                borc: l.borc,
                alacak: l.alacak,
                code: l.code,
                opDesc: l.opDesc,                
                itemDesc: l.itemDesc,
                date: Helper.Now()
          
        })
    }

    static addTotals(list: AccountModel []) {
        let b = 0.00, a = 0.00;        
        list.forEach(l=> {
            b+=Helper.asCurrency(l.borc);
            a+=Helper.asCurrency(l.alacak);
        })

        list.push(new AccountModel({
            alacak: Helper.asCurrency(a),
            borc: Helper.asCurrency(b),
            code: 'total',
            desc: 'Toplam'
        }))
    }

    static async listByOperations(operation: string []) {
        let list = await AccountModel.findAll({
            where: {
                operation: operation
            },
            order: [['date', 'asc']]
        })


        AccountModel.addTotals(list)

        return list;
    }

    static async list(codes: string[]) {
        let list = await AccountModel.findAll({
            where: {
                code: {
                    [Op.or]: codes.map(c=>{
                        return  {
                            [Op.or]: [
                                {[Op.like]: c + '.%' },
                                {[Op.eq]: c  },
                            ]
                            
                        }
                    })
                }
            },
            order: [['date', 'asc']]
        })


        AccountModel.addTotals(list)

        return list;
    }

    static async summary(codes: string[]): Promise<AccountModel> {
        let result = new AccountModel({
            code: 'total',
            name: 'Toplam'
        });
        let b = 0.00, a = 0.00
        for(let i=0;i<codes.length;i++) {
            let totals = await <any>AccountModel.sequelize.query(
                "SELECT sum(borc) as b, sum(alacak) as a FROM Accounts where code like :code1 or code = :code"
               ,
                {                
                    replacements: { code: codes[i], code1: codes[i] + '.%' },
                    type: sq.QueryTypes.SELECT,
                    mapToModel: false,
                    raw: true
                })
             let numbers = (totals.length <= 0) ?[0.00, 0.00]: [Helper.asCurrency(totals[0].b || 0), Helper.asCurrency(totals[0].a || 0)]
             result[codes[i]] = numbers;
             b+=Helper.asCurrency(numbers[0]);
             a+=Helper.asCurrency(numbers[1]);
        }
        result.borc = Helper.asCurrency(b);
        result.alacak = Helper.asCurrency(a);
        return result;
    }

    static async saveOperation(list: AccountingOperation, ops: SaveOptions) {
        let arr = [];
        list.accounts.forEach((l, i) => {
            var dbItem = AccountModel.fromAccount(l);
            dbItem.accorder = i;
            dbItem.operation = list.opcode;
            dbItem.opDesc = list.desc;
            arr.push(dbItem.save(ops))      
        })
        return Promise.all(arr);
    }

    @Column({
        allowNull: false
    })
    code: string;

    @Column({
        allowNull: true
    })
    name: string;    

    @Column({
        allowNull: false,
        type: DataType.INTEGER
    })
    accorder: number;    

    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    borc: number;
    
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(13, 2)
    })
    alacak: number;

    @Column({
        allowNull: false
    })
    opDesc: string;

    @Column({
        allowNull: false
    })
    itemDesc: string;    
    
    @Column({
        allowNull: false        
    })
    operation: string;        

    @Column({
        allowNull: false        
    })
    date: Date;       
}

export default AccountModel;