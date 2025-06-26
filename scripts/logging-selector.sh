#!/bin/bash

# AegisX Logging System Selector
# ใช้สำหรับเลือก monitoring solution ที่ต้องการ

set -e

echo "🏥 AegisX Logging System Selector"
echo "=================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop all monitoring services
stop_all_monitoring() {
    echo "🛑 Stopping all monitoring services..."
    
    # Stop all possible monitoring stacks
    docker-compose -f docker-compose.seq.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.loki.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.fluent-bit.yml down --remove-orphans 2>/dev/null || true
    
    echo "✅ All monitoring services stopped"
    echo
}

# Function to show current status
show_status() {
    echo "📊 Current Status:"
    echo "=================="
    
    # Check running containers
    RUNNING_MONITORS=$(docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E "(seq|loki|grafana|fluent-bit|promtail)" 2>/dev/null || true)
    
    if [ -z "$RUNNING_MONITORS" ]; then
        echo -e "${YELLOW}No monitoring services running${NC}"
    else
        echo -e "${GREEN}Running monitoring services:${NC}"
        echo "$RUNNING_MONITORS"
    fi
    echo
}

# Function to start Seq
start_seq() {
    echo "🔍 Starting Seq (SQL-based log analysis)"
    echo "========================================"
    
    # Update .env
    sed -i.bak 's/SEQ_ENABLED=false/SEQ_ENABLED=true/' .env 2>/dev/null || echo "SEQ_ENABLED=true" >> .env
    sed -i.bak 's/LOG_FILE_ENABLED=true/LOG_FILE_ENABLED=false/' .env 2>/dev/null || echo "LOG_FILE_ENABLED=false" >> .env
    
    # Start Seq
    docker-compose -f docker-compose.seq.yml up -d
    
    echo
    echo -e "${GREEN}✅ Seq started successfully!${NC}"
    echo "🌐 Access: http://localhost:5341"
    echo "📝 Direct Winston logs → Seq HTTP transport"
    echo
}

# Function to start Grafana + Loki (with Promtail)
start_loki() {
    echo "📈 Starting Grafana + Loki (Cloud-native)"
    echo "=========================================="
    
    # Update .env
    sed -i.bak 's/SEQ_ENABLED=true/SEQ_ENABLED=false/' .env 2>/dev/null || echo "SEQ_ENABLED=false" >> .env
    sed -i.bak 's/LOG_FILE_ENABLED=false/LOG_FILE_ENABLED=true/' .env 2>/dev/null || true
    
    # Start Loki stack
    docker-compose -f docker-compose.loki.yml up -d
    
    echo
    echo -e "${GREEN}✅ Grafana + Loki started successfully!${NC}"
    echo "🌐 Grafana: http://localhost:3001 (admin/admin123)"
    echo "🔧 Loki API: http://localhost:3100"
    echo "📝 File logs → Promtail → Loki → Grafana"
    echo
}

# Function to start Fluent Bit + Loki
start_fluent_bit() {
    echo "🚀 Starting Fluent Bit + Advanced Processing"
    echo "============================================="
    
    # Update .env
    sed -i.bak 's/SEQ_ENABLED=true/SEQ_ENABLED=false/' .env 2>/dev/null || echo "SEQ_ENABLED=false" >> .env
    sed -i.bak 's/LOG_FILE_ENABLED=false/LOG_FILE_ENABLED=true/' .env 2>/dev/null || true
    echo "FLUENT_BIT_ENABLED=true" >> .env 2>/dev/null || true
    
    # Switch to simple config for actual use
    sed -i.bak 's|fluent-bit-test.conf|fluent-bit-simple.conf|' docker-compose.fluent-bit.yml
    
    # Start Fluent Bit stack
    docker-compose -f docker-compose.fluent-bit.yml up -d
    
    echo
    echo -e "${GREEN}✅ Fluent Bit stack started successfully!${NC}"
    echo "🌐 Grafana: http://localhost:3001 (admin/admin123)"
    echo "⚡ Fluent Bit: http://localhost:2020 (monitoring)"
    echo "🔧 Loki API: http://localhost:3100"
    echo "📝 File logs → Fluent Bit (HIPAA + Processing) → Loki → Grafana"
    echo
}

# Function to start Fluent Bit with Elasticsearch
start_fluent_bit_es() {
    echo "📊 Starting Fluent Bit + Elasticsearch"
    echo "======================================="
    
    # Update .env
    sed -i.bak 's/SEQ_ENABLED=true/SEQ_ENABLED=false/' .env 2>/dev/null || echo "SEQ_ENABLED=false" >> .env
    sed -i.bak 's/LOG_FILE_ENABLED=false/LOG_FILE_ENABLED=true/' .env 2>/dev/null || true
    
    # Switch to full config for Elasticsearch
    sed -i.bak 's|fluent-bit-test.conf|fluent-bit.conf|' docker-compose.fluent-bit.yml
    
    # Start with Elasticsearch profile
    docker-compose -f docker-compose.fluent-bit.yml --profile elasticsearch up -d
    
    echo
    echo -e "${GREEN}✅ Fluent Bit + Elasticsearch started successfully!${NC}"
    echo "🔍 Elasticsearch: http://localhost:9200"
    echo "📊 Kibana: http://localhost:5601"
    echo "⚡ Fluent Bit: http://localhost:2020"
    echo "📝 File logs → Fluent Bit → Elasticsearch + Loki"
    echo
}

# Function to restart API
restart_api() {
    echo "🔄 Restarting API to apply new logging configuration..."
    
    # Check if API is running
    API_PID=$(ps aux | grep "nx serve api" | grep -v grep | awk '{print $2}' | head -1)
    
    if [ ! -z "$API_PID" ]; then
        echo "Stopping current API (PID: $API_PID)..."
        kill $API_PID 2>/dev/null || true
        sleep 2
    fi
    
    echo "Please restart API manually: npx nx serve api"
    echo
}

# Main menu
main_menu() {
    while true; do
        echo "🎯 Select Logging Solution:"
        echo "=========================="
        echo "1) 🔍 Seq (SQL-based analysis)"
        echo "2) 📈 Grafana + Loki (Simple)"
        echo "3) 🚀 Fluent Bit + Loki (Advanced + HIPAA)"
        echo "4) 📊 Fluent Bit + Elasticsearch (Analytics)"
        echo "5) 📊 Show Current Status"
        echo "6) 🛑 Stop All Monitoring"
        echo "7) 🔄 Restart API"
        echo "8) ❌ Exit"
        echo
        read -p "Choose option (1-8): " choice
        
        case $choice in
            1)
                stop_all_monitoring
                start_seq
                restart_api
                ;;
            2)
                stop_all_monitoring
                start_loki
                restart_api
                ;;
            3)
                stop_all_monitoring
                start_fluent_bit
                restart_api
                ;;
            4)
                stop_all_monitoring
                start_fluent_bit_es
                restart_api
                ;;
            5)
                show_status
                ;;
            6)
                stop_all_monitoring
                ;;
            7)
                restart_api
                ;;
            8)
                echo "👋 Goodbye!"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Please choose 1-8.${NC}"
                echo
                ;;
        esac
    done
}

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: Please run this script from the AegisX project root directory${NC}"
    exit 1
fi

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Start main menu
show_status
main_menu