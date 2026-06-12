import pandas as pd
import json

file_path = 'd:/workflow-agent/AiAgentChat/Mobile app Process flow.xlsx'
xl = pd.ExcelFile(file_path)

output = {}
for sheet in xl.sheet_names:
    df = xl.parse(sheet)
    # Convert all NaN to None or empty string to avoid JSON errors
    df = df.where(pd.notnull(df), None)
    output[sheet] = df.to_dict(orient='records')

with open('d:/workflow-agent/AiAgentChat/excel_dump.json', 'w') as f:
    json.dump(output, f, indent=2, default=str)
