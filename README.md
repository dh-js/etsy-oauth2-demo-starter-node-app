# Etsy OAuth 2.0 Authentication Demo App

This demonstration app guides new developers (or developers new to OAUth2.0/Etsy) through setting up OAuth 2.0 authentication with the Etsy Open API v3.

I've included detailed comments in the code to help you understand the steps and so make it easier for you to adapt the code to your own requirements.

### If you find the repo useful then please leave a star!

If you need help developing an Etsy API Node.js application then you can message/hire me at my Fiverr or Upwork links in my Github bio (Upwork profile may not be added yet).

The app is built using Node.js and Express and it uses Handlebars as the Express view engine.

It demonstrates the complete OAuth2.0 flow, and ultimately hits an /exampleRoute endpoint which you can modify to handle your own requests to an Etsy endpoint.

You can use the repo as a starting point to create your own application, or you can follow the steps and implement them in a language of your choice. Handlebars could be swapped out if you would prefer to use a different view engine.

If you have any amendments to the repo that you think other developers would find useful then feel free to open a pull request.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js (v14.x or higher)**
- **npm (v6.x or higher)**: Usually comes with Node.js.

### Register Your Application with Etsy

To use the Etsy API, you need to register an application in the Etsy Developer Dashboard:

1. Go to [Etsy Developers](https://www.etsy.com/developers/) and log in or create an account.
2. Register a new application to obtain your API key.
3. Note down the API key; you will need it for your `.env` file.
4. IMPORTANT: Add `http://localhost:3003/oauth/redirect` as a callback URL in your app settings on Etsy's dashboard. This is the redirect URI we are using in our OAuth 2.0 flow.

## Setup Instructions

### 1. Clone the Repository

Clone this repository to your local machine using Git:
git clone https://github.com/DaveyBuilder/etsy-oauth2-demo-starter-node-app.git

### 2. Install Dependencies

Navigate to the cloned directory and install the necessary npm packages:
cd your-local-clone-of-the-repo
npm install

### 3. Configure Environment Variables

Create a `.env` file in the root of your project directory and add the following line:
ETSY_API_KEY=your_etsy_api_key_here

Replace `your_etsy_api_key_here` with your API key from Etsy.

### 4. Start the Server

Run the following command to start the Express server:
npm start

This will start the server on `http://localhost:3003`. You can open this URL in your web browser.

## Using the Application

Navigate to `http://localhost:3003` in your web browser. You will see a page with a single button to start the Etsy authentication. On clicking, you will be redirected to Etsy and asked to authorize the application. After authorization, the ./views/home.hbs page is rendered.

If you want to dive straight into hitting Etsy endpoints then you can add your own logic into the /exampleRoute endpoint. I've extracted the tokens in this endpoint so that they are available for you to make requests to Etsy straight away.

The `./views/home.hbs` page contains a form which has the button that hits the `/exampleRoute` endpoint. The tokens from the auth are hidden values attached to the form. You could modify the form to attach files (e.g. .csv/.txt/.jpg) if you want to be able to pass files to the endpoint. (For the endpoint to be able to parse `multipart/form-data` such as files so that they are available in the request object you will need to install & incorporate middleware capabale of handling this, like the 'multer' library)

Different Etsy endpoints require different levels of scope. You can modify the scopes that your app uses by adding scopes to the `scopes` array in line 61. You will need to check the Etsy docs to see which scopes the endpoints that you would like to use require.
