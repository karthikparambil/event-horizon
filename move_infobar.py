import sys

with open('index.html', 'r') as f:
    lines = f.readlines()

info_bar_start = -1
info_bar_end = -1

for i, line in enumerate(lines):
    if '<!-- Info Bar Section -->' in line:
        info_bar_start = i
    if '<section class="stack-section"' in line and info_bar_start != -1 and info_bar_end == -1:
        # We need to find the </section> before the stack-section
        # Search backwards from here
        for j in range(i-1, info_bar_start, -1):
            if '</section>' in lines[j]:
                info_bar_end = j
                break

if info_bar_start == -1 or info_bar_end == -1:
    print("Could not find info bar bounds")
    sys.exit(1)

info_bar_lines = lines[info_bar_start:info_bar_end+1]

# Remove from original location
del lines[info_bar_start:info_bar_end+1]

# Find </main>
insert_idx = -1
for i, line in enumerate(lines):
    if '</main>' in line:
        insert_idx = i + 1
        break

if insert_idx == -1:
    print("Could not find </main>")
    sys.exit(1)

# Insert after </main>
# Also add an empty line before and after
lines = lines[:insert_idx] + ['\n'] + info_bar_lines + ['\n'] + lines[insert_idx:]

with open('index.html', 'w') as f:
    f.writelines(lines)

print("Successfully moved info bar section to immediately after </main>.")
