import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import userDoc from "./interfaces/general";
// import stripeDoc from "./stripe/stripe";
import {Stripe} from "stripe";
const stripe = new Stripe("sk_test_yTygNNymm5ZwMNF3FSRJII8A", {
  apiVersion: "2020-08-27",
});
// const domain = await stripe.applePayDomains.create({
//   domain_name: 'http://localhost:8100/tabs/more',
//   domain_name: 'http://townpass-6f3de.web.app/tabs/more',
// });
// const stripe = new Stripe(functions.config().stripe.secret, {
// import * as Stripe from "stripe";
// import * as stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");
admin.initializeApp();
// const admin = require("firebase-admin");

// import { stripe } from './stripe/stripe'

// npx eslint . --fix
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
interface userDoc {
  details: {
    id: string,
    title: string | undefined,
    subtitle: string | undefined,
    img: string | undefined,
    dark: boolean,
    email: string | undefined,
    lang: string,
    token: string,
    customer: string,
  },
  balance: number, points: number,
  locations: Array<string>, perks: Array<string>, milestones: Array<string>, connected: Array<string>,
}


// sendWelcomeEmail
exports.createUser = functions.auth.user().onCreate((data) => {
  const userRef = admin.firestore().collection("users");
  // generate stripe token
  const user = {
    details: {
      id: data.uid,
      title: data.displayName,
      subtitle: "",
      img: data.photoURL,
      dark: false,
      email: data.email,
      lang: "eng",
      token: "",
      customer: "",
    },
    balance: 0, points: 0,
    locations: [], perks: [], milestones: [], connected: [],
  };
  userRef.doc(data.uid).set(user);
  return createCustomer(user);
});

exports.deleteUser = functions.auth.user().onDelete((data) => {
  const userRef = admin.firestore().collection("users");
  userRef.doc(data.uid).delete();
});

// update user objectr to attatch (front end)
exports.updateUser = functions.firestore
  .document("/users/{uid}")
  .onUpdate(async (change, context) => {
  console.log("Updating User");
  // console.log(context);
  const before = change.before.data();
  const after = change.after.data();
  // console.log(before);
  // console.log(after);
  // set default card if changed
  if (after.details.token && before.details.token !== after.details.token) {
    stripe.customers.update(
      after.details.customer,
      {default_source: after.details.token},
    );
  // delete card if no source present
  } else if (before.details.token && !after.details.token) {
    stripe.customers.deleteSource(
      before.details.customer,
      before.details.token
    );
  }
  // if (before.balance < after.balance) {
  //   stripe.charges.create({
  //   amount: 2000,
  //     currency: "usd",
  //     customer: "usd",
  //     source: "tok_mastercard",
  //     description: "My First Test Charge (created for API docs)",
  //   })
  // }
});

// create, never attatch
exports.addCard = functions.firestore
  .document("/users/{uid}/payments/{card}")
  .onCreate(async (snap, context) => {
  console.log("Adding Card");
  // console.log(context);
  // console.log(snap.data());
  const card = stripe.customers.createSource(
    // const customer = await stripe.customers.update(
    snap.data().customer,
    {source: context.params.card}
  );
  console.log(card);
    // function(err, confirm) {
    //   console.log(err);
    //   console.log(confirm);
    // }
});

exports.removeCard = functions.firestore
  .document("/users/{uid}/payments/{card}")
  .onDelete(async (snap, context) => {
  // console.log(context);
  // console.log(snap.data());
  console.log("Remove Card");
  const card = stripe.customers.deleteSource(
    snap.data().customer,
    context.params.card
  );
  console.log(card);
  return;
    // function(err, confirm) {
    //   console.log(err);
    //   console.log(confirm);
    // }
});

export const reloadCard = functions.https.onRequest(async (req, res) => {
// Charge -> Success -> update customer balance ->
  // const charge = await stripe.charges.create({
  //   amount: 2000,
  //   currency: "usd",
  //   customer: "usd",
  //   source: "tok_mastercard",
  //   description: "My First Test Charge (created for API docs)",
  // })
  // const customer = req.query.customer;
  const uid = req.body.uid;
  const customer = req.body.customer;
  const amount = req.body.amount;
  const token = req.body.token;
  console.log("data", uid, customer, amount, token);
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
   res.end();
  } else {
    // try {
      // const charge = await createCharge(amount, "usd", customer, token, "My First Test Charge");
      const charge = await stripe.charges.create({
        amount: amount,
        currency: "usd",
        customer: customer,
        source: token,
        description: "My First Test Charge",
      }).catch((e) => {
        res.status(500).send({error: e.message});
      });
      // const transaction = await createBalanceTransaction(amount, "usd", customer);
      const transaction = await stripe.customers.createBalanceTransaction(
        customer,
        {amount: amount, currency: "usd"}
      ).catch((e) => {
        res.status(500).send({error: e.message});
      });
      if (transaction) {
        const bal = transaction;
        const updateBalance = await admin.firestore().collection("users").doc(uid).update({balance: bal.ending_balance}
        ).catch((e) => {
          res.status(500).send({error: e.message});
        });
        res.send({charge: charge, transaction: transaction, balance: updateBalance});
      } else {
        res.status(500).send({error: "balance charged but not updated locally"});
      }
    // } catch (error) {
    //     console.log(error);
    //     res.status(500).send(error);
    // }
  }
  // console.log(res);
//   if (req.method === "OPTIONS") {
//    res.end();
//   } else {
//     const charge = await createCharge(amount, "usd", source, "My First Test Charge");
//     // get response ending balance and update profile
//     // negative amount when purchase
//     const balanceTransaction = await createBalanceTransaction(amount, "usd", customer);
//     const updateBalance = await admin.firestore().collection('users').doc(uid).update({balance});

//     functions.logger.info("Hello logs!", {structuredData: true});
//     // console.log(req);
//     res.send("Hello from Firebase!");
//   }
});

// async function createCharge(amount: number, currency: string, customer: string, source: string, description: string) {
//   const charge = await stripe.charges.create({
//     amount: amount,
//     currency: currency,
//     customer: customer,
//     source: source,
//     description: description,
//   }).catch((e) => {
//     console.log("Error: ", e.message); return {status: false, err: e};
//   });
//   return {status: true, data: charge};
// }

// async function createBalanceTransaction(amount: number, currency: string, customer: string) {
//   const transaction = await stripe.customers.createBalanceTransaction(
//     customer,
//     {amount: amount, currency: "usd"}
//   ).catch((e) => {
//     console.log("Error: ", e.message); return {status: false, err: e};
//   });
//   return {status: true, data: transaction};
// }

// id
// token
// amount
// application
// application_fee
// application_fee_amount
// balance_transaction
// email
// exports.reloadCard = functions.firestore
//   .document("/users/{uid}/charges/{charge}")
//   .onDelete(async (snap, context) => {
//   const charge = await stripe.charges.create({
//     amount: 2000,
//     currency: 'usd',
//     customer: 'usd',
//     source: 'tok_mastercard',
//     description: 'My First Test Charge (created for API docs)',
//   })
// });


// exports.onCreateUser = functions.firestore
//   .document("/users/{uid}")
//   .onCreate(async (snapshot, context) => {
//     console.log("Follower Created", snapshot.data());
//     const userId = context.params.userId;
//     const followerId = context.params.followerId;

//     // 1. Create followed users posts
//     const followedUserPostsRef = admin
//       .firestore()
//       .collection("posts")
//       .doc(userId)
//       .collection("userPosts");

//     // 2. Create following user's timeline
//     const timelinePostsRef = admin
//       .firestore()
//       .collection("timeline")
//       .doc(followerId)
//       .collection("timelinePosts");

//     // 3. Get the followed users posts
//     const querySnapshot = await followedUserPostsRef.get();
//     console.log("QuerySnapshot", querySnapshot.size);

//     // 4. Add each user post to following user's timeline
//     querySnapshot.forEach(doc => {
//       if (doc.exist) {
//         const postId = doc.id;
//         const postData = doc.data();
//         timelinePostsRef.doc(postId).set(postData);
//       }
//     });
//   });

function createCustomer(doc:userDoc) {
  // const customer = await stripe.customers.create({
  const userRef = admin.firestore().collection("users");
  return stripe.customers.create({
    description: "My First Test Customer (created for API docs)",
  }).then((x:any) => {
    console.log(x.id);
    doc.details.customer = x.id;
    userRef.doc(doc.details.id).set(doc, {merge: true});
      return true;
  });
}

