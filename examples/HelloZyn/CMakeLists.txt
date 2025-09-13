cmake_minimum_required(VERSION 3.20)
project(HelloZyn CXX)
set(CMAKE_CXX_STANDARD 17)
add_executable(app src/main.cpp)
enable_testing()
add_test(NAME app_runs COMMAND app)
add_test(NAME basic_assert COMMAND ${CMAKE_COMMAND} -E env "CTEST_FULL_OUTPUT=1" $<TARGET_FILE:app>)


