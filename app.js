const express= require("express")
const dotEnv = require('dotenv').config()

const mongoose = require("mongoose")
mongoose.connect("mongodb+srv://sana:AliAdem2410@cluster0.elzoxwk.mongodb.net/cooking?retryWrites=true&w=majority",
{useNewUrlParser:true,useUnifiedTopology:true})

const BodyParser = require("body-parser")
const ejs =require("ejs")
const randToken = require("rand-token")
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose =require("passport-local-mongoose")



const methodOverride = require("method-override")
const flash = require("connect-flash")
const bodyParser = require("body-parser")
const bcrypt = require('bcrypt')
const nodemailer=require("nodemailer")
// models
const User = require('./models/user.js')
const Reset = require('./models/reset.js')
const Receipe=require('./models/receipe.js')
const Ingredient=require('./models/ingredient.js')
const Favourite=require('./models/favorite.js')
const Schedule = require('./models/schedule.js')
const app = express()
/****utilisation de session */
app.use(session({
    secret:"mysecret",
    resave:false,
    saveUninitialized:false
}))
/***iniyialisation de passport */
app.use(passport.initialize())
/**liaison entre passort et session */
app.use(passport.session())
/****passport local mongoose */
passport.use(User.createStrategy())
/***serilaise pour abvoir tout les infos de l'utilisateur */
passport.serializeUser(User.serializeUser())
/****pour detruit le cookies de users  */
passport.deserializeUser(User.deserializeUser())
 /***pour avoir acces au dossier views */
app.set("view engine","ejs")
 /***pour avoir acces au dossier public */
app.use(express.static("public"))
app.use(methodOverride("_method"))
app.use(bodyParser.urlencoded({extended:false}))
app.use(flash());

app.use(function(req,res,next){
    res.locals.currentUser = req.user
    res.locals.error = req.flash("error")
    res.locals.success = req.flash("success")
    next();
})
app.get("/",function(req,res){
    console.log("===>user",req.user)
    res.render('index')
})

app.get("/signup",function(req,res){
    res.render("signup")
})
app.post("/signup",function(req,res){
        /***avec utilisation de bcrypt */

    // const saltRounds = 10
    // bcrypt.hash(req.body.password,saltRounds,function(err,hash){
    //     const user={
    //         username:req.body.username,
    //         password:hash
    //     }
    //     User.create(user)
    //     .then((docs)=>{
    //         console.log('===>doc',docs)
    //         res.render("index")
    //     }).catch((err)=>{
    //         console.log('====>err',err)
    //     })
    // })
    const newUser = new User({
        username : req.body.username,

    })
    User.register(newUser,req.body.password,function(err,user){
        if(err){
            console.log(err)
            return res.render("signup")
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("signup")
            })
        }
    })
    })
 


app.get("/login",function(req,res){
    res.render("login")

})
app.post("/login",function(req,res){
    /***avec utilisation de bcrypt */
    // User.findOne({
    //     username:req.body.username
    // })
    // .then((docs)=>{
    //     console.log("docs",docs)
    //   if(docs){
    //     bcrypt.compare(req.body.password,docs.password,function(err,result){
    //         if(result==true){
    //             console.log("super tu es connecté")
    //             res.render('index')
    //         }
    //     })
    //   }
    // }).catch((err)=>{
    //     console.log("err",err)
    //     res.send("erreur tu n'existe pas")
    // })
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user,function(err){
        if(err){
            console.log(err)
        }else{
            passport.authenticate("local")(req,res,function(){
                req.flash("success","congratiuations,you are logged ")
                res.redirect("/dashboard")
            })
        }
    })
})

app.get('/dashboard',isLoggedIn,function(req,res){
  
    res.render("dashboard")
})
app.get("/logout",function(req,res){
    req.logout(function(){
        req.flash("success","you are now logged out")
        res.redirect("/login")
    })
   

    


})
/****forgot password */
app.get("/forgot",function(req,res){
    res.render('forgot')
})

app.post("/forgot",function(req,res){
User.findOne({username:req.body.username})
    .then((docs)=>{
    if(docs){
        
        const token= randToken.generate(16)   
        console.log('token',token) 
       Reset.create({
        username:docs.username,
        resetPasswordToken:token,
        resetPasswordExpires:parseInt(Date.now()+3600000)
       })
       const transporter =nodemailer.createTransport({
        service:'gmail',
        secure: true,
        auth: {
            
            user:'walid.rouis@ilo.com.tn',
            pass:process.env.PWD,
        },
       
       
       })
       const mailOptions ={
        from:"walid.rouis@ilo.com.tn",
        to:req.body.username,
        subject:"link to reset your password",
        text:"click in this link to reset your password:http://localhost:3000/reset/"+token
       }
       console.log("le mail est pret")

       transporter.sendMail(mailOptions,function(err,response){
        if(err){
            console.log(err)
        }else{
            res.redirect('/login')
        }
       })
    }
})
    .catch((err)=>{
    console.log(err)
    res.redirect('/login')
})
})

/***reset password */

app.get("/reset/:token",function(req,res){
    Reset.findOne({
        resetPasswordToken:req.params.token,
        resetPasswordExpires:{$gt:parseInt(Date.now())}
    })
    .then((docs)=>{
        if(docs){
            res.render('reset',{token:req.params.token},)
        }
        else{
            res.redirect("/login")
        }
    })
})


app.post("/reset/:token",function(req,res){
    Reset.findOne({
        resetPasswordToken:req.params.token,
        resetPasswordExpires:{$gt:parseInt(Date.now())}
    })
    .then((docs)=>{
     
            if(req.body.password==req.body.password2){
                User.findOne({username : docs.username})
                .then((user)=>{
                    user.setPassword(req.body.password,function(err){
                        if(err){
                            console.log(err)

                        }else{
                            user.save();
                            const updatedReset={
                                resetPasswordToken:null,
                                resetPasswordExpires:null,
                            }
                        Reset.findOneAndUpdate({resetPasswordToken:req.params.token},updatedReset)
                        .then((docs)=>{
                                if(err){
                                    console.log(err)
                                }else{
                                    res.redirect('/login')
                                }
                            })
                        }
                    })
                })
            }
        
      
    })  
    .catch((err)=>{
        console.log("====>err",err)
     res.redirect('/login')
    })
})
/****receipe route***** */
app.get("/dashboard/myreceipes",function(req,res){
    Receipe.find({
        user:req.user.id
    })
    .then((receipe)=>{
        res.render('receipe',{receipe:receipe})

    })
    .catch((err)=>{
        console.log(err)
    })
})
//********create new receipe*** */
app.get("/dashboard/newreceipe",function(req,res){
res.render('newreceipe')
})
app.post("/dashboard/newreceipe",function(req,res){
    const newRecipe={
        name:req.body.name,
        image:req.body.logo,
        user:req.user._id

    }
    Receipe.create(newRecipe)
    .then((docs)=>{
       
            req.flash("success","new receipe added")
            res.redirect('/dashboard/myreceipes')
    })
    .catch((err)=>{
    console.log("==>err",err)
})
    
      
        

})
app.get("/dashboard/myreceipes/:id",function(req,res){
   
    Receipe.findOne({
        user:req.user._id,
        _id:req.params.id

    })
    .then((receipeFound)=>{
        Ingredient.find({
         user:req.user._id,
         receipe:req.params.id

        })
        .then((ingredientFound)=>{
            console.log("ingredient",ingredientFound)
            res.render("ingredients",{
                ingredient:ingredientFound,
                receipe:receipeFound
            })
        })
        .catch((err)=>{
                console.log("err",err)
            })
        
    })
    .catch((err)=>{
console.log("err",err)
    })
})
/***add ingredient */
app.get('/dashboard/myreceipes/:id/newingredient',function(req,res){
    Receipe.findById({_id:req.params.id})
    .then((receipeFound)=>{
        res.render('newingredient',{receipe:receipeFound})
    })
})

app.post("/dashboard/myreceipes/:id",function(req,res){
    const newIngredient={
        name:req.body.name,
        bestDish:req.body.dish,
        user:req.user.id,
        quantity:req.body.quantity,
        receipe:req.params.id,
    }
    Ingredient.create(
        newIngredient)
    .then((ingredient)=>{
        req.flash('success',"your ingredient has been added")
        res.redirect("/dashboard/myreceipes/"+req.params.id)

    })
})
/****delete ingredient ****/
app.delete("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,function(req,res){
    Ingredient.deleteOne({
        _id:req.params.ingredientid,
    
    })
    .then(function(){
        req.flash("success","ingredient has ben deleted")
        res.redirect('/dashboard/myreceipes/'+req.params.id)
    })
    .catch(function(){
        console.log("err",err)
    })
})
/****update ingredient ****/
app.post("/dashboard/myreceipes/:id/:ingredientid/edit",isLoggedIn,function(req,res){
    Receipe.findOne({
        user:req.user._id,
        _id:req.params.id

    })
    .then(function(receipeFound){
        console.log('receipeFound',receipeFound)
        Ingredient.findOne({
            _id:req.params.ingredientid,
            receipe:req.params.id
        }).then(function(ingredientFound){
         res.render("edit",{ingredient:ingredientFound,receipe:receipeFound})
        })
    })
    .catch(function(err){
        console.log("err",err)
    })
})
app.put('/dashboard/myreceipes/:id/:ingredientid',isLoggedIn,function(req,res){
   
   const ingredient_updated={
        name:req.body.name,
        bestDish:req.body.dish,
        user:req.user.id,
        quantity:req.body.quantity,
        receipe:req.params.id,
   }
    Ingredient.findByIdAndUpdate({_id:req.params.ingredientid},ingredient_updated)
    .then(function(updated_ingredient){
        req.flash('success',"success updated")
        res.redirect('/dashboard/myreceipes/'+req.params.id)
    })
    .catch(function(err){
        console.log("err",err)
    })
})
/***delete receipe ***/
app.delete("/dashboard/myreceipes/:id",isLoggedIn,function(req,res){
 
        Receipe.deleteOne({
            _id:req.params.id
        })
        .then(function(){
         req.flash('success','success deleted')
         res.redirect("/dashboard/myreceipes")
        })
        .catch(function(){
            console.log("err delete",err)
        })
        
})
/****routes favourite */
app.get("/dashboard/favourites",function(req,res){
    Favourite.find({user:req.user._id})
    .then(function(favourite) {
        res.render('favourites',{favourite:favourite})
    })
    .catch(function(err){
        console.log("error find favorite",err)
    })
   
})

app.get("/dashboard/favourites/newfavourite",isLoggedIn,function(req,res){
    res.render('newfavourite')
})
app.post("/dashboard/favourites",isLoggedIn,function(req,res){
const newFavourite={
    image:req.body.image,
    title:req.body.title,
    description:req.body.description,
    user:req.user.id
   } 
   Favourite.create(newFavourite)
   .then(function(favorite){
    req.flash("success","favourite has been added")
    res.redirect("/dashboard/favourites")
   })
   .catch(function(err){
    console.log("errer",err)
   })

}
)
app.delete('/dashboard/favourites/:id',isLoggedIn,function(req,res){
    Favourite.deleteOne({_id:req.params.id})
    .then(function(){
       req.flash('success',"favorite deleted")
       res.redirect('/dashboard/favourites')
    })
})

/***route schedule ****/
app.get("/dashboard/schedule",isLoggedIn,function(req,res){
    Schedule.find({user:req.user.id})
    .then(function(schedule){
        res.render("schedule",{schedule:schedule})
        
    })
})
app.get("/dashboard/schedule/newschedule",isLoggedIn,function(req,res){
    res.render('newSchedule')
})
app.post("/dashboard/schedule",isLoggedIn,function(req,res){
    const newSchedule={
        receipeName:req.body.receipename,
        scheduleDate:req.body.scheduleDate,
        user:req.user.id,
        time:req.body.time,
    }
      Schedule.create(newSchedule)
      .then(function(schedule){
        req.flash("success","schedule has been added")
        res.redirect('/dashboard/schedule')
      })
      .catch(function(err){
        console.log("err",err)
      })
})

app.delete("/dashboard/schedule/:id",isLoggedIn,function(req,res){
   
    Schedule.deleteOne({_id:req.params.id})
    .then(function(){
        req.flash("success","schedule has been deleted")
        res.redirect('/dashboard/schedule')
    })
    .catch((err)=>{
        console.log("err",err)
    })
})
/***function de connexion */
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next()

    }else{
       req.flash("error","please login first")
        res.redirect('/login')
    }
}


app.listen("3000",function(req,res){
    console.log("tout se passe bien")
})