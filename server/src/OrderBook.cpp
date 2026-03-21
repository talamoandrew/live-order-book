#include "OrderBook.h"
#include <iostream>

void OrderBook::updateBid(double price, double size)
{
    if (size < 1e-9)
        bids.erase(price);
    else
        bids[price] = size;
}

void OrderBook::updateAsk(double price, double size)
{
    if (size < 1e-9)
        asks.erase(price);
    else
        asks[price] = size;
}

void OrderBook::print(int levels)
{
    int n = 0;
    for (auto& it : asks)
    {
        printf("Ask: %.2f  Size: %.8f\n", it.first, it.second);
        if (++n >= levels || n >= (int)asks.size())
            break;
    }

    printf("----------------------------------------\n");

    n = 0;
    for (auto& it : bids)
    {
        printf("Bid: %.2f  Size: %.8f\n", it.first, it.second);
        if (++n >= levels || n >= (int)bids.size())
            break;
    }
}

void OrderBook::clear()
{
    bids.clear();
    asks.clear();
}