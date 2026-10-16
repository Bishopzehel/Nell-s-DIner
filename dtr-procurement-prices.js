/* DTR procurement price direction adapter.
   Cost tools must use the price the POB pays for incoming goods (BASE BUYS),
   never the price a player pays when buying goods from the POB (BASE SELLS). */
(() => {
  'use strict';
  if (window.DTRProcurementPrices || !window.DTRApp) return;

  const originalApp = window.DTRApp;
  const finite = value => {
    if (value === null || value === undefined || value === '') return null;
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : null;
  };

  function pobPurchasePrice(item) {
    if (!item) return null;
    const value = finite(
      item?.price_to_sell_to_base
      ?? item?.sell_price
      ?? item?.price_sell
    );
    return value !== null && value > 0 ? value : null;
  }

  function validPrice(value) {
    const price = finite(value);
    return price !== null && price > 0 ? price : null;
  }

  function pobSalePrice(item) {
    if (!item) return null;
    // Tool-facing clones already have their original Darkstat sale quote captured.
    // Do not read their item.price as a fallback: it has become BASE BUYS.
    if (Object.prototype.hasOwnProperty.call(item, 'dtrBaseSellPrice')) {
      return validPrice(item.dtrBaseSellPrice);
    }
    return validPrice(item.price_to_buy_from_base)
      ?? validPrice(item.buy_price)
      ?? validPrice(item.price_buy)
      ?? validPrice(item.price);
  }

  function adaptItem(item) {
    if (!item || typeof item !== 'object') return item;
    const purchasePrice = pobPurchasePrice(item);
    const salePrice = pobSalePrice(item);
    /* Preserve both original price directions on tool-facing clones:
       item.price is BASE BUYS for existing cost tools, while the distinct
       dtrBaseSellPrice holds BASE SELLS for Invicta Exotic Systems valuation.
       A null sale quote must never fall through to item.price (which may be $1). */
    return { ...item, dtrBaseSellPrice: salePrice, price: purchasePrice ?? 0 };
  }

  function adaptBase(base) {
    if (!base || typeof base !== 'object') return base;
    const source = base.shop_items ?? base.shopItems ?? base.goods;
    if (!Array.isArray(source)) return base;
    const adapted = source.map(adaptItem);
    const copy = { ...base };
    if (Array.isArray(base.shop_items)) copy.shop_items = adapted;
    if (Array.isArray(base.shopItems)) copy.shopItems = adapted;
    if (Array.isArray(base.goods)) copy.goods = adapted;
    return copy;
  }

  function adaptMap(source) {
    if (!(source instanceof Map)) return source;
    return new Map([...source].map(([key, base]) => [key, adaptBase(base)]));
  }

  function getState() {
    const state = originalApp.getState();
    return {
      ...state,
      bases: adaptMap(state.bases),
      previousBases: adaptMap(state.previousBases)
    };
  }

  window.DTRApp = Object.freeze({ ...originalApp, getState });
  window.DTRProcurementPrices = Object.freeze({ pobPurchasePrice, pobSalePrice, adaptBase });
  document.documentElement.dataset.dtrProcurementPrice = 'base-buys';

  function fixCalculatorLabels() {
    document.querySelectorAll('.calculator-status').forEach(node => {
      if (node.textContent.trim() === 'NO SALE PRICE') node.textContent = 'NO BUY PRICE';
    });
  }

  function scheduleLabelFix(delay = 0) {
    window.setTimeout(fixCalculatorLabels, delay);
  }

  window.addEventListener('dtr:statechange', () => scheduleLabelFix());
  document.addEventListener('click', event => {
    if (event.target?.closest?.('#calculatorView')) scheduleLabelFix();
  }, true);
  document.addEventListener('change', event => {
    if (event.target?.closest?.('#calculatorView')) scheduleLabelFix();
  }, true);
  document.addEventListener('input', event => {
    if (event.target?.closest?.('#calculatorView')) scheduleLabelFix(180);
  }, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleLabelFix(), { once: true });
  } else {
    scheduleLabelFix();
  }
})();