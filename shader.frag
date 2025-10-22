#version 330 core

// uniform vec3 color;
uniform vec3 position;
uniform vec3 lookat;
uniform vec3 up;

uniform sampler2D starfield;

in vec3 color;

layout (location = 0) out vec4 out_color;


vec3 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    float G=6.0;
    float M=3000;
    float c=300.0;
    float R=2.0*G*M/(c*c); // Schwarzschild radius

    for(int i = 0; i < 10000; i++) {
        vec3 p = ro + rd * t;
        // vec3 p = ro;

        // float d = length(p) - 1.0; // distance to sphere of radius 1
        // if(d < 0.01) {
        //     return vec3(dot(p,vec3(0.5773))); // hit
        // }else if(d> 100.0) {
        //     return vec3(1.0,0.0,0.0); // too far
        // }

        float d = length(p);
        if(d<R) {
            return vec3(0.0,0.0,0.0); // hit black hole
        }else if(d>100.0){
            return vec3(1.0,0.0,0.0); // too far
        }
        vec3 acc = -normalize(p) * (G * M) / (d * d);
        // rd=normalize(rd+acc*0.1);
        rd+=acc*0.1;
        ro+=rd*0.1;

        t+=0.1;
    }
    return vec3(1.0,0.0,0.0); // miss
    
}

void main() {
    vec3 f = normalize(lookat);          // forward
    vec3 r = normalize(cross(f, up));     // right
    vec3 u = cross(r, f);                    // corrected up

    mat3 viewRot = mat3(r, u, -f);

    vec3 dir = normalize(viewRot*(color*2.0-1.0));
    vec3 res = raymarch(position, dir);
    if(res==vec3(1.0,0.0,0.0)){
        vec2 uv_coord=vec2(
            0.5+(atan(dir.x,dir.z)/6.283185),
            0.5+(asin(dir.y)/3.141592)
        );
        out_color = texture(starfield, uv_coord);
        return;
    }
    out_color = vec4(res, 1.0);
    return;
}