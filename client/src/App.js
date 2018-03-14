import React, { Component } from 'react';
import queryString  from 'query-string';
import axios from 'axios';
import './App.css';

class App extends Component {
  constructor() {
    super();
    // Check if there is an access token in the query string.
    let access = queryString.parse(window.location.search).access_token;
    this.state = { // State could also be stored in session storage or local storage
      isLoggedIn: false,
      shopUrl: 'riverboat-gaming-poker.myshopify.com', // From database on login.
      sales: 0,
      accessToken: access || null, // This will not be stored here. retieve from database on api calls.
      isApiConnected: !!access, // From database on login.
      data: {
        orders: null,
        inventory: null
      },
      username: "",
      password: ""
    }
  }

  signInOut(isSigningIn) {
    this.setState({ isLoggedIn: isSigningIn})
  }

  usernameInput(e) {
    this.setState({ username: e.target.value })
  }

  passwordInput(e) {
    this.setState({ password: e.target.value })
  }

  connectToShopify() {
    // Hard coded to redirect to the connect route - the shop name here should be pulled in from the database.
    window.location = `http://localhost:8888/connect?shop=${this.state.shopUrl}`;
  }

  pullOrdersFromShopify() {
    axios.post('http://localhost:8888/request-data', {
      accessToken: this.state.accessToken,
      shop: this.state.shopUrl,
      endpoint: "orders"
    })
    .then((res) => {
      this.setState({ data: {...this.state.data, orders: res.data.orders.slice(10) }});
    }).catch((err) => {
      console.log(err);
    })
  }

  pullInventoryFromShopify() {
    axios.post('http://localhost:8888/request-data', {
      accessToken: this.state.accessToken,
      shop: this.state.shopUrl,
      endpoint: "inventory"
    })
    .then((res) => {
      this.setState({ data: { ...this.state.data, inventory: res.data.products.slice(10) }});
    }).catch((err) => {
      console.log(err);
    })
  }

  render() {
    const { isApiConnected, data, isLoggedIn } = this.state;
    return (
      <div className="App">
        {
          isLoggedIn ? (
            <div>
              <h4>Click Here to Connect to Shopify</h4>
              <button onClick={() => this.connectToShopify()}>Connect</button>
              <h4>Logout</h4>
              <button onClick={() => this.signInOut(false)}>Logout</button>
              {
                isApiConnected && (
                  <div>
                    <div>
                      <h4>Click Here to Pull Orders from Shopify</h4>
                      <button onClick={() => this.pullOrdersFromShopify()}>Pull Orders</button>
                    </div>
                    <div>
                      <h4>Click Here to Pull Inventory from Shopify</h4>
                      <button onClick={() => this.pullInventoryFromShopify()}>Pull Inventory</button>
                    </div>
                  </div>
                )
              }
              <div style={{ display: "flex", margin: "auto", width: "800px"}}>
                {
                  data.orders && (
                    <div>
                      <h4>Orders</h4>
                      <div>{data.orders.map(item => (
                        <div key={item.id}>{item.email}</div>
                      ))}</div>
                    </div>
                  )
                }
                {
                  data.inventory && (
                    <div>
                      <h4>Inventory</h4>
                      <div>{data.inventory.map(item => (
                        <div key={item.id}>{item.title}</div>
                      ))}</div>
                    </div>
                  )
                }
              </div>
            </div>
          ) : (
            <div style={{ width: "400px", margin: "auto"}}>
              <h4>Login to access your account</h4>
              <input placeholder="Username" type="text" value={this.state.username} onChange={(e) => this.usernameInput(e)} />
              <input placeholder="Password" type="password" value={this.state.password} onChange={(e) => this.passwordInput(e)} />
              <button onClick={() => this.signInOut(true)}>Login</button>
            </div>
          )
        }

      </div>
    );
  }
}

export default App;
