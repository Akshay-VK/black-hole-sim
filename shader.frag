#version 330 core

// uniform vec3 color;
uniform vec3 position;
uniform vec3 lookat;
uniform vec3 up;

uniform sampler2D starfield;

in vec3 color;

layout (location = 0) out vec4 out_color;

float sdRoundedCylinder( vec3 p, float ra, float rb, float h )
{
  vec2 d = vec2( length(p.xz)-ra+rb, abs(p.y) - h + rb );
  return min(max(d.x,d.y),0.0) + length(max(d,0.0)) - rb;
}

vec3 bg(vec3 dir){
    vec2 uv_coord=vec2(
        0.5+(atan(dir.x,dir.z)/6.283185),
        0.5+(asin(dir.y/length(dir))/3.141592)
    );
    return texture(starfield, uv_coord).xyz;
}


vec3 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    float G=0.3;
    float c=3.0;
    // float R=0.66; // Schwarzschild radius
    float M=1.0;
    float R=2.0*G*M/(c*c); // Schwarzschild radius


    float d = length(ro);
    vec3 original_rd=normalize(rd);
    for(int i = 0; i < 1000; i++) {
        // vec3 p = ro + rd * t;
        vec3 p = ro;

        // float d = length(p) - 1.0; // distance to sphere of radius 1
        // if(d < 0.01) {
        //     return vec3(dot(p,vec3(0.5773))); // hit
        // }else if(d> 100.0) {
        //     return vec3(1.0,0.0,0.0); // too far
        // }
        d=length(p);
        if(d<R) {
            return vec3(0.0,0.0,0.0); // hit black hole
        }
        else if(d>200.0){
            return bg(normalize(rd)); // too far
        }
        // else{
        //     if(p.y<0.01 && p.y>-0.01 && length(p)<3.0){
        //         return vec3(1.0,1.0,1.0); // hit accretion disk
        //     }
        // }


        vec3 acc = -normalize(p) * (G * M) / (d * d);
        // rd=normalize(rd-(G*p*(0.1/pow(d,3.0))*M));
        rd+=acc*0.1;
        rd=normalize(rd);
        ro+=rd*0.1;

        // t+=0.1;
    }
    // return vec3(dot(original_rd,rd));
    // if(d>10000.0){
    //     return vec3(1.0,0.0,0.0); // too far
    // }

    // if(ro.y<0.01 && ro.y>-0.01 && length(ro)<3.0){
    //     return vec3(1.0,1.0,1.0); // hit accretion disk
    // }
    
    // return vec3(1.0,0.0,0.0); // miss
    
    return bg(rd);
    
}

void main() {
    vec3 f = normalize(lookat);          // forward
    // vec3 f = normalize(lookat-position);          // forward
    vec3 r = normalize(cross(f, up));     // right
    vec3 u = cross(r, f);                    // corrected up

    mat3 viewRot = mat3(r, u, -f);

    vec3 dir = normalize(viewRot*(color*2.0-1.0));
    vec3 res = raymarch(position, dir);
    if(res==vec3(1.0,0.0,0.0)){
        out_color = vec4(bg(dir), 1.0);
        return;
    }
    out_color = vec4(res, 1.0);
    return;
}