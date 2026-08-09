import json

def fix_analysis(act_id):
    with open(f"tmp/act_{act_id}_details.json", "r", encoding="utf-8") as f:
        details = json.load(f)
    
    descriptors = details.get("metricDescriptors", [])
    print("Descriptors:")
    for d in descriptors:
        print(f"  Index {d.get('metricsIndex')}: {d.get('key')}")
        
    metrics = details.get("activityDetailMetrics", [])
    if metrics:
        print("First metric row sample:")
        print(metrics[0].get("metrics"))

print("=== 23839065583 (Today) ===")
fix_analysis("23839065583")
print("\n" + "="*50 + "\n")
print("=== 23816559852 (25km) ===")
fix_analysis("23816559852")
