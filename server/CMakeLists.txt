cmake_minimum_required(VERSION 3.20)
project(live-order-book)
set(CMAKE_CXX_STANDARD 17)
find_package(Threads REQUIRED)
find_package(ixwebsocket CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(unofficial-uwebsockets CONFIG REQUIRED)
add_executable(live-order-book src/main.cpp src/OrderBook.cpp src/Server.cpp)
target_include_directories(live-order-book PRIVATE src)
target_link_libraries(live-order-book PRIVATE
    ixwebsocket::ixwebsocket
    Threads::Threads
    nlohmann_json::nlohmann_json
    unofficial::uwebsockets::uwebsockets
)