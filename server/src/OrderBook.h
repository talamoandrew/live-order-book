#pragma once
#include <map>
#include <functional>

class OrderBook
{
public:
    void updateBid(double price, double size);
    void updateAsk(double price, double size);
    void clear();
    void print(int levels);
    const std::map<double, double, std::greater<double>>& getBids() const { return bids; }
    const std::map<double, double>& getAsks() const { return asks; }

private:
    std::map<double, double, std::greater<double>> bids;
    std::map<double, double> asks;
};