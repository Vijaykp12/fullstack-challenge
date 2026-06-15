import { gql } from "@apollo/client";

export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      role
      country
    }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      role
      country
    }
  }
`;

export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    restaurants {
      id
      name
      cuisine
      country
      imageUrl
      menuItems {
        id
        restaurantId
        name
        price
        currency
        description
      }
    }
    orders {
      id
      userId
      country
      status
      totalAmount
      currency
      createdAt
      paymentMethodId
      paymentMethod {
        id
        country
        methodType
        details
      }
      items {
        id
        menuItemId
        quantity
        price
        menuItem {
          id
          name
        }
      }
      user {
        id
        name
        role
        country
      }
    }
    paymentMethods {
      id
      country
      methodType
      details
    }
  }
`;

export const CREATE_ORDER = gql`
  mutation CreateOrder($country: String!, $items: [OrderItemInput!]!) {
    createOrder(country: $country, items: $items) {
      id
      status
      totalAmount
      currency
    }
  }
`;

export const PAY_ORDER = gql`
  mutation PayOrder($orderId: Int!) {
    payOrder(orderId: $orderId) {
      id
      status
    }
  }
`;

export const CANCEL_ORDER = gql`
  mutation CancelOrder($orderId: Int!) {
    cancelOrder(orderId: $orderId) {
      id
      status
    }
  }
`;

export const UPDATE_PAYMENT_METHOD = gql`
  mutation UpdatePaymentMethod($id: Int!, $methodType: String!, $details: String!) {
    updatePaymentMethod(id: $id, methodType: $methodType, details: $details) {
      id
      methodType
      details
    }
  }
`;
