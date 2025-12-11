const { default: axios } = require("axios");
const crypto =require('crypto')
const { chargily_base_url, chargily_public_key, chargily_secret_key, chargily_success_url, chargily_failure_url } = require("../config/config");
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const Transaction = require('../models/transactionModel')
const User = require('../models/userModel')

exports.createPayment = catchAsync(async(req,res,next)=>{
    const {amount} = req.body
    if(!amount || amount<=0){
        return next(new AppError('المبلغ غير صالح',400))
    }
    const payload ={
        currency:'dzd',
        amount,
        success_url:chargily_success_url,
        failure_url:chargily_failure_url,
        metadata:{
            userId:req.user.id // from middleware,
        }
    }
    const response = await axios.post(`${chargily_base_url}/checkouts`,payload,{
        headers:{
            Authorization:`Bearer ${chargily_secret_key}`,
            'Content-Type':'application/json'
        }
    })
    const {checkout_url , id , payment_method} =response.data
    if(!checkout_url){
        return next (new AppError('فشل في إنشاء صفحة الدفع',500))
    }
     await Transaction.create({
        userId:req.user.id ,// from middleware,
        amount,
        chargilyCheckoutId:id,
        status:'PENDING',
        paymentMethod:payment_method
    })
    res.status(200).json({
        status:'تم إنشاء صفحة دفع بنجاح',
        checkout_url
    })
})
exports.addWebhook = catchAsync(async(req,res,next)=>{
    // Extracting the 'signature' header from the HTTP request
    const signature =req.headers["signature"];
    // Getting the raw payload from the request body
// raw body (مهم)
            const rawBody = req.body;
    // If there is no signature, ignore the request
    if (!signature) {
        return next(new AppError('Missing signature',400))
    }
    // Calculate the signature
    const computedSignature = crypto.createHmac('sha256', chargily_secret_key)
        .update(rawBody)
        .digest('hex');
    console.log(signature , computedSignature )
    // If the calculated signature doesn't match the received signature, ignore the request
    if (computedSignature !== signature) {
        return next(new AppError("signature doesn't match the received signature",403));
    }    

    
    // If the signatures match, proceed to decode the JSON payload
    const event = JSON.parse(rawBody.toString());

    console.log("✓ Webhook received:", event.type);
    // Switch based on the event type
    switch (event.type) {
        case 'checkout.paid':
            const checkout = event.data;
            const userId= checkout.metadata.userId
            // update the current user balance
            const user = await User.findById(userId)
            if(!user){
                return next(new AppError('user not found',404))
            }
            user.balance += checkout.amount
            await user.save({
                validateBeforeSave:false
            })
            // update the transaction
            const transaction = await Transaction.findOne({
                userId
            })
             if(!transaction){
                return next(new AppError('transaction not found',404))
            }
            transaction.status = 'SUCCESS'
            await transaction.save()
            break;
        case 'checkout.failed':
            const failedCheckout = event.data;
            console.log("✗ Payment failed", failedCheckout);

            // Handle the failed payment.
            break;
    }

    // Respond with a 200 OK status code to let us know that you've received the webhook
     res.sendStatus(200);
})