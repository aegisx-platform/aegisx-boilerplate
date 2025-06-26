-- HIPAA compliance data sanitization script for Fluent Bit
-- Removes or masks sensitive healthcare information

function sanitize_sensitive_data(tag, timestamp, record)
    local new_record = record
    
    -- List of sensitive field patterns (case-insensitive)
    local sensitive_patterns = {
        "ssn", "social_security", "social_security_number",
        "dob", "date_of_birth", "birth_date",
        "patient_id", "medical_record", "mrn",
        "phone", "telephone", "mobile",
        "email", "email_address",
        "address", "street", "zip", "postal_code",
        "credit_card", "card_number", "cvv",
        "password", "token", "api_key", "secret",
        "diagnosis", "medication", "treatment",
        "insurance", "policy_number"
    }
    
    -- Sensitive data patterns in text
    local text_patterns = {
        -- SSN patterns
        {pattern = "%d%d%d%-%d%d%-%d%d%d%d", replacement = "***-**-****"},
        {pattern = "%d%d%d%d%d%d%d%d%d", replacement = "*********"},
        
        -- Phone number patterns
        {pattern = "%(%d%d%d%) %d%d%d%-%d%d%d%d", replacement = "(***) ***-****"},
        {pattern = "%d%d%d%-%d%d%d%-%d%d%d%d", replacement = "***-***-****"},
        
        -- Email patterns
        {pattern = "[%w%._%-%+]+@[%w%._%-%+]+%.%w+", replacement = "***@***.***"},
        
        -- Credit card patterns
        {pattern = "%d%d%d%d %d%d%d%d %d%d%d%d %d%d%d%d", replacement = "**** **** **** ****"},
        {pattern = "%d%d%d%d%-%d%d%d%d%-%d%d%d%d%-%d%d%d%d", replacement = "****-****-****-****"},
        
        -- Date patterns (potential DOB)
        {pattern = "%d%d/%d%d/%d%d%d%d", replacement = "**/**/****"},
        {pattern = "%d%d%d%d%-%d%d%-%d%d", replacement = "****-**-**"}
    }
    
    -- Function to check if field name is sensitive
    local function is_sensitive_field(field_name)
        local lower_field = string.lower(field_name)
        for _, pattern in ipairs(sensitive_patterns) do
            if string.find(lower_field, pattern) then
                return true
            end
        end
        return false
    end
    
    -- Function to sanitize text content
    local function sanitize_text(text)
        if type(text) ~= "string" then
            return text
        end
        
        local sanitized = text
        for _, pattern_info in ipairs(text_patterns) do
            sanitized = string.gsub(sanitized, pattern_info.pattern, pattern_info.replacement)
        end
        return sanitized
    end
    
    -- Function to mask sensitive data
    local function mask_data(value)
        if type(value) == "string" then
            if string.len(value) <= 4 then
                return "****"
            else
                return string.sub(value, 1, 2) .. "****" .. string.sub(value, -2)
            end
        elseif type(value) == "number" then
            return "****"
        else
            return "****"
        end
    end
    
    -- Process all fields in the record
    for field_name, field_value in pairs(new_record) do
        if is_sensitive_field(field_name) then
            -- Mask sensitive fields completely
            new_record[field_name] = mask_data(field_value)
            
            -- Add audit trail for sanitization
            new_record["sanitized_fields"] = (new_record["sanitized_fields"] or "") .. field_name .. ","
            
        elseif type(field_value) == "string" then
            -- Sanitize text content in non-sensitive fields
            local original_value = field_value
            local sanitized_value = sanitize_text(field_value)
            
            if original_value ~= sanitized_value then
                new_record[field_name] = sanitized_value
                new_record["text_sanitized"] = true
            end
        end
    end
    
    -- Special handling for common log fields
    if new_record["message"] and type(new_record["message"]) == "string" then
        new_record["message"] = sanitize_text(new_record["message"])
    end
    
    if new_record["error"] and type(new_record["error"]) == "table" then
        if new_record["error"]["message"] then
            new_record["error"]["message"] = sanitize_text(new_record["error"]["message"])
        end
        if new_record["error"]["stack"] then
            new_record["error"]["stack"] = sanitize_text(new_record["error"]["stack"])
        end
    end
    
    -- Add HIPAA compliance markers
    if new_record["sanitized_fields"] or new_record["text_sanitized"] then
        new_record["hipaa_sanitized"] = true
        new_record["compliance_processed"] = true
    end
    
    -- Add compliance level if not present
    if not new_record["complianceLevel"] and tag:match("aegisx") then
        new_record["complianceLevel"] = "HIPAA"
    end
    
    return 1, timestamp, new_record
end