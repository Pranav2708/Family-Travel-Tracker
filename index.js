import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "kjvbPm@27",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let users = [];

async function getCurrentUser() {
  const result = await db.query("select * from users");
  users = result.rows;
 return users.find((user) => user.id == currentUserId); 
}

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries join users on visited_countries.user_id = users.id where users.id = $1;",
   [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  
  try {
  const result = await db.query("select country from countries where lower(country_name) like '%' || $1 || '%';", 
  [input.toLowerCase()]);
  console.log(result);
  // here to take user input given we have to display the variable by $no and put the actual input we want in an array

    const data = result.rows[0];
    const countryCode = data.country;
  
    try {
  await db.query("insert into visited_countries (country_code, user_id) values ($1, $2)", 
  [countryCode, currentUserId]);
  res.redirect("/");
    } catch(err) {
      console.log(err);
      const countries = await checkVisited();
      res.render("index.ejs", {countries: countries, total: countries.length, error: 'Country has already been added, try again'});
    }
} catch(error) {
  console.log(error);
  const countries = await checkVisited();
  res.render("index.ejs", {countries: countries, total: countries.length, error: 'Country name does not exist try again'});
}
 });

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
  currentUserId = req.body.user;
  res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  try {
  const result = await db.query(
  "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
  [name, color]);
  // returns this new record that was added

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
  } catch (err) {
    console.log(err.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
